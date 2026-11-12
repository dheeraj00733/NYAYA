-- ==============================================================================
-- NyayaFlow Database Seeds: 001_seed_demo_data.sql
-- Synthetic Legal Demo Data for Testing and Evaluation
-- ==============================================================================

-- 1. USERS
-- Password for all seed users: Password@123
-- Hash generated via bcrypt rounds=10 (verified working)
INSERT INTO users (id, email, password_hash, full_name, role, phone, bar_council_id, organization, avatar_url, is_active)
VALUES
    ('a0000000-0000-0000-0000-000000000001', 'admin@nyayaflow.com', '$2a$10$xTeYbks4XTcD1vqi3ekfW.kBh.52Xc6hPTj.wtDdXEkLeRi5kR.CG', 'Vikramaditya Sen (Admin)', 'admin', '+91 98110 00001', 'D/ADMIN/2005', 'NyayaFlow Global HQ', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150', TRUE),
    ('a0000000-0000-0000-0000-000000000002', 'advocate.sharma@nyayaflow.com', '$2a$10$xTeYbks4XTcD1vqi3ekfW.kBh.52Xc6hPTj.wtDdXEkLeRi5kR.CG', 'Adv. Rajesh Sharma', 'lawyer', '+91 98220 11223', 'D/1482/2012', 'Sharma & Associates Legal Chambers', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150', TRUE),
    ('a0000000-0000-0000-0000-000000000003', 'advocate.menon@nyayaflow.com', '$2a$10$xTeYbks4XTcD1vqi3ekfW.kBh.52Xc6hPTj.wtDdXEkLeRi5kR.CG', 'Adv. Priya Menon', 'lawyer', '+91 98330 44556', 'K/0912/2015', 'Menon Corporate Law Partners', 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150', TRUE),
    ('a0000000-0000-0000-0000-000000000004', 'client.verma@nyayaflow.com', '$2a$10$xTeYbks4XTcD1vqi3ekfW.kBh.52Xc6hPTj.wtDdXEkLeRi5kR.CG', 'Sunil Verma (Client)', 'client', '+91 98440 77889', NULL, 'Anand Tech Solutions Pvt Ltd', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150', TRUE)
ON CONFLICT (email) DO NOTHING;

-- 2. CASES
INSERT INTO cases (id, case_number, title, description, category, status, priority, court_name, court_type, judge_name, filing_date, next_hearing_date, created_by)
VALUES
    ('c0000000-0000-0000-0000-000000000001', 'CRL-WP-2024-8841', 'Anand Tech Solutions vs. State of NCT & Ors.', 'Criminal Writ Petition seeking quashing of First Information Report (FIR No. 402/2023) alleging unauthorized data interception under Section 66 of Information Technology Act and Section 420 IPC.', 'criminal', 'hearing', 'urgent', 'High Court of Delhi', 'High Court', 'Hon''ble Justice Prathiba Singh', '2024-02-14', '2025-04-18', 'a0000000-0000-0000-0000-000000000002'),
    ('c0000000-0000-0000-0000-000000000002', 'ARB-COMM-2023-104', 'Apex Infrastructure Ltd. vs. Metro Rail Corp.', 'Commercial Arbitration dispute arising from Clause 18 of EPC Contract No. 44 relating to delay penalties, escalated steel input costs, and liquidated damages amounting to INR 42.8 Crores.', 'corporate', 'pending', 'high', 'Arbitral Tribunal (Sole Arbitrator)', 'Tribunal', 'Hon''ble Justice (Retd.) A. K. Sikri', '2023-11-05', '2025-05-02', 'a0000000-0000-0000-0000-000000000003'),
    ('c0000000-0000-0000-0000-000000000003', 'CIVIL-APPEAL-2024-332', 'Kavita Rao vs. Sunbeam Housing Society', 'Civil Regular First Appeal challenging eviction directive and disputed non-occupancy charges under Maharashtra Co-operative Societies Act 1960.', 'civil', 'filed', 'medium', 'Bombay High Court', 'High Court', 'Hon''ble Justice G. S. Patel', '2024-08-20', '2025-04-29', 'a0000000-0000-0000-0000-000000000002'),
    ('c0000000-0000-0000-0000-000000000004', 'IPR-TRADEMARK-2024-19', 'BioNova Pharmaceuticals vs. NovaGen Biotech', 'Commercial Intellectual Property Suit for permanent injunction restraining trademark and trade dress infringement under Trade Marks Act 1999.', 'ipr', 'decided', 'low', 'High Court of Delhi (Commercial Division)', 'High Court', 'Hon''ble Justice C. Hari Shankar', '2024-01-10', NULL, 'a0000000-0000-0000-0000-000000000003')
ON CONFLICT (case_number) DO NOTHING;

-- 3. CASE MEMBERS (Collaborators and Client Observers)
INSERT INTO case_members (id, case_id, user_id, role_in_case, can_edit, can_upload, can_chat)
VALUES
    ('10000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', 'lead_counsel', TRUE, TRUE, TRUE),
    ('10000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000004', 'client_observer', FALSE, FALSE, TRUE),
    ('10000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000003', 'lead_counsel', TRUE, TRUE, TRUE),
    ('10000000-0000-0000-0000-000000000004', 'c0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000002', 'lead_counsel', TRUE, TRUE, TRUE)
ON CONFLICT (case_id, user_id) DO NOTHING;

-- 4. PARTIES
INSERT INTO parties (id, name, party_type, contact_email, contact_phone, address)
VALUES
    ('20000000-0000-0000-0000-000000000001', 'Anand Tech Solutions Pvt Ltd', 'corporation', 'legal@anandtech.example.com', '+91 11 4100 2000', 'Plot 42, Okhla Industrial Area Phase III, New Delhi 110020'),
    ('20000000-0000-0000-0000-000000000002', 'State of NCT of Delhi (Cyber Cell)', 'government_body', 'cybercell.delhi@gov.example.in', '+91 11 2349 0000', 'Police Headquarters, ITO, New Delhi 110002'),
    ('20000000-0000-0000-0000-000000000003', 'Apex Infrastructure Ltd.', 'corporation', 'contracts@apexinfra.example.com', '+91 22 2650 9000', 'BKC Corporate Park, Bandra East, Mumbai 400051'),
    ('20000000-0000-0000-0000-000000000004', 'Metro Rail Corporation Ltd.', 'government_body', 'procurement@metrorail.example.com', '+91 11 2341 7910', 'Metro Bhawan, Fire Brigade Lane, Barakhamba Road, New Delhi 110001'),
    ('20000000-0000-0000-0000-000000000005', 'Kavita Rao', 'individual', 'kavita.rao@example.com', '+91 98200 33441', 'Flat 402, Sunbeam Heights, Dadar West, Mumbai 400028'),
    ('20000000-0000-0000-0000-000000000006', 'Sunbeam Cooperative Housing Society Ltd.', 'trust', 'secretary@sunbeamchs.example.com', '+91 22 2430 1199', 'Plot 18, Ranade Road, Dadar West, Mumbai 400028')
ON CONFLICT DO NOTHING;

-- 5. CASE PARTIES
INSERT INTO case_parties (id, case_id, party_id, party_role, advocate_name, legal_counsel_firm)
VALUES
    ('30000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'petitioner', 'Adv. Rajesh Sharma', 'Sharma & Associates'),
    ('30000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002', 'respondent', 'Standing Counsel Rahul Mehra', 'Office of Standing Counsel, GNCTD'),
    ('30000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000003', 'petitioner', 'Adv. Priya Menon', 'Menon Corporate Law Partners'),
    ('30000000-0000-0000-0000-000000000004', 'c0000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000004', 'respondent', 'Senior Adv. Arvind Datar', 'Datar Chambers')
ON CONFLICT DO NOTHING;

-- 6. LEGAL DOCUMENTS
INSERT INTO legal_documents (id, case_id, uploaded_by, title, file_name, file_path, file_size_bytes, mime_type, document_category, total_pages, processing_status, summary_text, summary_generated_at)
VALUES
    ('d0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', 'Writ Petition Under Article 226 - Quashing of FIR 402/2023', 'Writ_Petition_Anand_Tech_Quashing.pdf', 'storage/uploads/Writ_Petition_Anand_Tech_Quashing.pdf', 1428590, 'application/pdf', 'petition', 18, 'completed', 
    'The petitioner, Anand Tech Solutions Pvt Ltd, moves the Hon''ble High Court of Delhi under Article 226 of the Constitution of India praying for issuance of a writ in the nature of certiorari for quashing FIR No. 402/2023 registered at PS Cyber Cell. The petitioner submits that the dispute arises out of a commercial licensing agreement and does not disclose ingredients of an offence under Section 66 of IT Act or Section 420 IPC. The petitioner contends that police investigation is an abuse of legal process to coerce settlement of an ordinary civil debt.', 
    CURRENT_TIMESTAMP),
    ('d0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', 'Interim Order granting Protection Against Coercive Action (18-Mar-2024)', 'Interim_Order_Protection_18Mar2024.pdf', 'storage/uploads/Interim_Order_Protection_18Mar2024.pdf', 412800, 'application/pdf', 'order', 3, 'completed', 
    'The High Court of Delhi, presided over by Hon''ble Justice Prathiba Singh, heard learned counsel for petitioner Adv. Rajesh Sharma. Having regard to the commercial nature of contractual covenants between parties, the Court directed that no coercive steps shall be taken against the directors of the petitioner company till the next date of hearing, subject to petitioner joining the investigation as and when summoned in writing.', 
    CURRENT_TIMESTAMP),
    ('d0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000003', 'Claim Statement for Escalation and Liquidated Damages', 'Claim_Statement_Apex_Infra_Arbitration.pdf', 'storage/uploads/Claim_Statement_Apex_Infra_Arbitration.pdf', 3892010, 'application/pdf', 'pleading', 42, 'completed', 
    'Statement of Claim submitted by Apex Infrastructure Ltd before Sole Arbitrator Hon''ble Justice (Retd.) A. K. Sikri. Claimant seeks an award directing Respondent Metro Rail Corp to pay INR 42.8 Crores with 12% interest for delayed handover of Right of Way (ROW) and wrongful withholding of milestone retention funds.', 
    CURRENT_TIMESTAMP)
ON CONFLICT DO NOTHING;

-- 7. EXTRACTED FACTS
INSERT INTO extracted_facts (id, document_id, case_id, fact_type, key_field, fact_value, confidence_score, source_page, excerpt, is_verified, verified_by, verified_at)
VALUES
    ('f0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'petitioner', 'Petitioner Name', 'Anand Tech Solutions Pvt Ltd', 0.99, 1, 'IN THE MATTER OF: Anand Tech Solutions Pvt Ltd ...Petitioner', TRUE, 'a0000000-0000-0000-0000-000000000002', CURRENT_TIMESTAMP),
    ('f0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'respondent', 'Respondent 1', 'State of NCT of Delhi', 0.98, 1, 'VERSUS State of NCT of Delhi & Ors. ...Respondents', TRUE, 'a0000000-0000-0000-0000-000000000002', CURRENT_TIMESTAMP),
    ('f0000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'case_number', 'FIR Number', 'FIR No. 402/2023 PS Cyber Cell', 0.95, 2, 'seeking quashing of FIR No. 402/2023 registered at PS Cyber Cell under Sections 66 IT Act and 420 IPC', TRUE, 'a0000000-0000-0000-0000-000000000002', CURRENT_TIMESTAMP),
    ('f0000000-0000-0000-0000-000000000004', 'd0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'legal_section', 'Statutory Provisions', 'Section 66 IT Act, Section 420 IPC, Article 226 Constitution of India', 0.94, 3, 'invocation of penal provisions under Section 66 IT Act and Section 420 of IPC is patently unwarranted', TRUE, 'a0000000-0000-0000-0000-000000000002', CURRENT_TIMESTAMP),
    ('f0000000-0000-0000-0000-000000000005', 'd0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000001', 'directive', 'Interim Relief Ordered', 'No coercive steps shall be taken against directors subject to joining investigation upon written notice', 0.97, 2, 'It is directed that no coercive steps shall be taken against the Petitioner''s directors until the next date of hearing.', TRUE, 'a0000000-0000-0000-0000-000000000002', CURRENT_TIMESTAMP),
    ('f0000000-0000-0000-0000-000000000006', 'd0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000002', 'outcome', 'Claim Amount', 'INR 42,80,00,000 (INR 42.8 Crores) with 12% p.a. interest', 0.96, 5, 'praying for an Award in the sum of INR 42.80 Crores together with pendente lite and future interest @ 12% p.a.', FALSE, NULL, NULL)
ON CONFLICT DO NOTHING;

-- 8. HEARINGS
INSERT INTO hearings (id, case_id, hearing_date, hearing_time, court_room, purpose, presiding_judge, outcome_summary, next_steps, status)
VALUES
    ('40000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', '2024-03-18', '10:30:00', 'Courtroom 24', 'admission', 'Hon''ble Justice Prathiba Singh', 'Notice issued to State. Interim protection granted against coercive steps.', 'File rejoinder to State status report within 4 weeks.', 'completed'),
    ('40000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000001', '2025-04-18', '11:00:00', 'Courtroom 24', 'final_argument', 'Hon''ble Justice Prathiba Singh', NULL, 'Final arguments on Section 482 / Article 226 petition.', 'scheduled'),
    ('40000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000002', '2025-05-02', '14:30:00', 'Arbitration Room 3, India International Centre', 'evidence', 'Hon''ble Justice (Retd.) A. K. Sikri', NULL, 'Cross-examination of Claimant''s engineering expert witness.', 'scheduled')
ON CONFLICT DO NOTHING;

-- 9. CHATS & MESSAGES
INSERT INTO chats (id, case_id, document_id, user_id, title, model_name)
VALUES
    ('50000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', 'Quashing Grounds and Interim Protection Inquiry', 'qwen2.5:latest')
ON CONFLICT DO NOTHING;

INSERT INTO messages (id, chat_id, sender_type, content, citations, retrieved_chunk_ids)
VALUES
    ('60000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', 'user', 'What are the main legal grounds cited by the petitioner for quashing FIR 402/2023?', '[]'::jsonb, '[]'::jsonb),
    ('60000000-0000-0000-0000-000000000002', '50000000-0000-0000-0000-000000000001', 'assistant', 
    'Based on the **Writ Petition (Writ_Petition_Anand_Tech_Quashing.pdf)**, the petitioner submits three primary legal grounds for quashing FIR No. 402/2023:

1. **Purely Civil & Commercial Nature**: The controversy arises out of a Software Licensing and Service Level Agreement dated 12.01.2022. The petitioner asserts that contractual billing disputes cannot be criminalized into offences of cheating under Section 420 IPC *(Page 4, Para 9)*.
2. **Absence of Ingredients under Section 66 IT Act**: The petition demonstrates that authorized system administrative access cannot be equated with "hacking" or unauthorized data interception under the Information Technology Act 2000 *(Page 6, Para 14)*.
3. **Abuse of Judicial Process**: The lodging of the FIR at PS Cyber Cell is alleged to be an arm-twisting tactic aimed at coercing an unadjudicated monetary settlement without approaching the agreed commercial arbitration forum *(Page 9, Para 21)*.

*Note: This synthesis is derived strictly from case filings and does not constitute formal legal advice.*',
    '[{"document_id":"d0000000-0000-0000-0000-000000000001","document_title":"Writ_Petition_Anand_Tech_Quashing.pdf","page_number":4,"excerpt":"The dispute between the parties is purely of a civil and commercial nature arising out of contractual interpretation...","similarity_score":0.892},{"document_id":"d0000000-0000-0000-0000-000000000001","document_title":"Writ_Petition_Anand_Tech_Quashing.pdf","page_number":6,"excerpt":"Ingredients of Section 66 of the Information Technology Act are completely unfulfilled as the access was strictly authorized...","similarity_score":0.864}]'::jsonb,
    '[]'::jsonb)
ON CONFLICT DO NOTHING;

-- 10. ACTIVITY LOGS
INSERT INTO activity_logs (id, case_id, user_id, action_type, entity_type, entity_id, details)
VALUES
    ('70000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', 'create', 'case', 'c0000000-0000-0000-0000-000000000001', '{"title": "Anand Tech Solutions vs. State of NCT & Ors.", "category": "criminal"}'::jsonb),
    ('70000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', 'upload', 'document', 'd0000000-0000-0000-0000-000000000001', '{"filename": "Writ_Petition_Anand_Tech_Quashing.pdf", "pages": 18}'::jsonb),
    ('70000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', 'verify', 'fact', 'f0000000-0000-0000-0000-000000000001', '{"field": "Petitioner Name", "verified": true}'::jsonb),
    ('70000000-0000-0000-0000-000000000004', 'c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', 'chat', 'chat', '50000000-0000-0000-0000-000000000001', '{"query": "Quashing Grounds and Interim Protection Inquiry"}'::jsonb)
ON CONFLICT DO NOTHING;
