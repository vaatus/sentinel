import axios from "axios";
import { db } from "./db/schema";

// SENTINEL: seeded violation for framework=PCI, control=3.4.1
// VIOLATION PCI 3.4.1 PAN at rest: stores credit card number (PAN) in plaintext
// to the transactions table with no encryption. Field name "card_number" should
// trigger regex prefilters looking for PAN storage violations.

export async function processPayment(patientId: number, amount: number, cardNumber: string, cvv: string, expiry: string) {
  console.log(`Processing payment of $${amount} for patient ${patientId}`);
  
  // VIOLATION PCI 3.4.1: Storing full PAN (Primary Account Number) unencrypted
  // Should use tokenization or encryption, never store full card number
  const transactionId = Math.floor(Math.random() * 1000000);
  await db.query(`
    INSERT INTO transactions (
      id, 
      patient_id, 
      amount, 
      card_number, 
      cvv, 
      expiry, 
      status,
      created_at
    ) VALUES (
      ${transactionId},
      ${patientId},
      ${amount},
      '${cardNumber}',
      '${cvv}',
      '${expiry}',
      'pending',
      NOW()
    )
  `);
  
  // SENTINEL: seeded violation for framework=PCI, control=4.2.1
  // VIOLATION PCI 4.2.1 Transmission: sending PAN over HTTP (not HTTPS)
  // Cleartext transmission of cardholder data violates PCI DSS requirement
  // for strong cryptography during transmission over open, public networks
  try {
    const response = await axios.post("http://payment-gateway.example.com/charge", {
      transaction_id: transactionId,
      card_number: cardNumber,  // Sending full PAN in cleartext
      cvv: cvv,
      expiry: expiry,
      amount: amount,
      merchant_id: "CLINIC_12345"
    }, {
      headers: {
        "Content-Type": "application/json"
      }
    });
    
    // Update transaction status
    await db.query(`
      UPDATE transactions 
      SET status = 'completed', 
          gateway_response = '${JSON.stringify(response.data)}'
      WHERE id = ${transactionId}
    `);
    
    return {
      success: true,
      transactionId,
      message: "Payment processed successfully"
    };
  } catch (error) {
    await db.query(`
      UPDATE transactions 
      SET status = 'failed'
      WHERE id = ${transactionId}
    `);
    
    throw new Error(`Payment failed: ${error}`);
  }
}

// Helper function to retrieve stored card numbers (also a violation)
export async function getStoredCards(patientId: number) {
  // VIOLATION: Retrieving and returning full PANs from storage
  const cards = await db.query(`
    SELECT card_number, expiry 
    FROM transactions 
    WHERE patient_id = ${patientId}
    GROUP BY card_number, expiry
  `);
  
  return cards;
}

// Made with Bob
