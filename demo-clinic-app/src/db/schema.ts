// VIOLATION §164.312(a)(2)(iv): PHI columns stored as plaintext (no encryption-at-rest annotation).

export const patientsTable = `
  CREATE TABLE patients (
    id INTEGER PRIMARY KEY,
    name: varchar(255),
    ssn: varchar(11),
    dob: varchar(10),
    mrn: varchar(32),
    diagnosis: text,
    address: text,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )
`;

export const appointmentsTable = `
  CREATE TABLE appointments (
    id INTEGER PRIMARY KEY,
    patient_id: integer,
    slot: varchar(64),
    diagnosis: text,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )
`;

export const db = {
  async query(_sql: string): Promise<any> {
    return [];
  },
};
