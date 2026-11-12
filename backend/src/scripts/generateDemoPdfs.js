const fs = require('fs');
const path = require('path');

function createSimplePdf(pagesText) {
  // Generates a valid multi-page PDF 1.4 using raw PDF syntax
  const objects = [];
  let currentOffset = 9; // strlen("%PDF-1.4\n")

  const offsets = [];

  const addObj = (str) => {
    offsets.push(currentOffset);
    const objStr = `${objects.length + 1} 0 obj\n${str}\nendobj\n`;
    objects.push(objStr);
    currentOffset += Buffer.byteLength(objStr, 'utf8');
    return objects.length;
  };

  // Obj 1: Catalog
  const catalogIdx = addObj(`<< /Type /Catalog /Pages 2 0 R >>`);

  // Obj 2: Pages (placeholder, will fill references)
  // Let's create Font obj first
  const fontIdx = addObj(`<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>`);

  // Create each page and content stream
  const pageObjIndices = [];
  pagesText.forEach((text, i) => {
    // Format text into PDF stream commands
    const lines = text.split('\n');
    let streamBody = 'BT\n/F1 11 Tf\n50 720 Td\n16 TL\n';
    lines.forEach((line) => {
      // Escape parentheses in line
      const escaped = line.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
      streamBody += `(${escaped}) '\n`;
    });
    streamBody += 'ET\n';

    const streamLength = Buffer.byteLength(streamBody, 'utf8');
    const contentIdx = addObj(`<< /Length ${streamLength} >>\nstream\n${streamBody}endstream`);

    const pageIdx = addObj(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${fontIdx} 0 R >> >> /Contents ${contentIdx} 0 R >>`);
    pageObjIndices.push(pageIdx);
  });

  // Re-encode Pages container
  const kidsStr = pageObjIndices.map(idx => `${idx} 0 R`).join(' ');
  const pagesObjStr = `<< /Type /Pages /Kids [ ${kidsStr} ] /Count ${pageObjIndices.length} >>`;

  // We rewrite objects[1] (Obj 2: Pages)
  objects[1] = `2 0 obj\n${pagesObjStr}\nendobj\n`;

  // Recalculate offsets properly
  let runningOffset = 9;
  const finalOffsets = [0]; // 0000000000 65535 f
  for (let i = 0; i < objects.length; i++) {
    finalOffsets.push(runningOffset);
    runningOffset += Buffer.byteLength(objects[i], 'utf8');
  }

  // Build xref
  let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objects.length; i++) {
    const off = finalOffsets[i].toString().padStart(10, '0');
    xref += `${off} 00000 n \n`;
  }

  const trailer = `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${runningOffset}\n%%EOF\n`;

  return Buffer.from(`%PDF-1.4\n${objects.join('')}${xref}${trailer}`, 'utf8');
}

const uploadsDir = path.resolve(__dirname, '../../../storage/uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// 1. Writ Petition Anand Tech
const writPetitionText = [
  `IN THE HIGH COURT OF DELHI AT NEW DELHI\nCRIMINAL WRIT PETITION NO. 8841 OF 2024\n\nIN THE MATTER OF:\nANAND TECH SOLUTIONS PVT. LTD.         ...PETITIONER\nTHROUGH ITS AUTHORIZED DIRECTOR\n\nVERSUS\n\n1. STATE OF NCT OF DELHI               ...RESPONDENT NO. 1\nTHROUGH STANDING COUNSEL (CRIMINAL)\n\n2. CYBER CRIME CELL, DELHI POLICE      ...RESPONDENT NO. 2\n\nWRIT PETITION UNDER ARTICLE 226 OF THE CONSTITUTION OF INDIA\nPRAYING FOR ISSUANCE OF A WRIT OF CERTIORARI OR ANY OTHER\nAPPROPRIATE WRIT FOR QUASHING OF FIR NO. 402/2023 DATED 14.11.2023\nREGISTERED UNDER SECTION 66 OF THE INFORMATION TECHNOLOGY ACT, 2000\nAND SECTION 420 OF THE INDIAN PENAL CODE, 1860.`,

  `MEMO OF FACTS AND GROUNDS\n\n1. The Petitioner is a duly incorporated technology company engaged in the\ndevelopment of enterprise cloud infrastructure and security management.\n\n2. The dispute between the parties is purely of a civil and commercial nature\narising out of contractual interpretation of the Master Service Agreement\ndated 12.01.2022 entered into with the de-facto complainant.\n\n3. The impugned FIR No. 402/2023 was registered maliciously at PS Cyber Cell\nto coerce the Petitioner into settling a disputed commercial invoice.\n\n4. It is well settled by the Hon'ble Supreme Court in State of Haryana v. Bhajan Lal\nthat criminal proceedings instituted with an ulterior motive for wreaking\nvengeance are liable to be quashed under writ jurisdiction.`,

  `LEGAL SUBMISSIONS AND GROUNDS FOR QUASHING\n\nA. NO OFFENCE UNDER SECTION 66 OF THE IT ACT:\nThe ingredients of Section 66 are completely unfulfilled. The Petitioner had\nlegitimate, contractually authorized root administrative access to the server\nenvironment. Access with authorization cannot constitute hacking.\n\nB. INGREDIENTS OF SECTION 420 IPC ARE ABSENT:\nThere was no fraudulent or dishonest intention at the inception of the contract.\nMere inability to fulfill commercial milestones due to pandemic supply delays\ndoes not constitute the criminal offence of cheating.\n\nPRAYER:\nIn view of facts and circumstances stated hereinabove, Petitioner prays that this\nHon'ble Court may be pleased to:\n(a) Issue a Writ of Certiorari quashing FIR No. 402/2023 PS Cyber Cell;\n(b) Pass an ad-interim order restraining coercive action against directors.`
];

// 2. Interim Order
const orderText = [
  `IN THE HIGH COURT OF DELHI AT NEW DELHI\n\nW.P. (CRL) 8841/2024\n\nANAND TECH SOLUTIONS PVT. LTD.         ...Petitioner\nThrough: Adv. Rajesh Sharma, Advocate.\n\nversus\n\nSTATE OF NCT OF DELHI & ORS.           ...Respondents\nThrough: Mr. Rahul Mehra, Senior Standing Counsel (GNCTD).\n\nCORAM:\nHON'BLE MS. JUSTICE PRATHIBA M. SINGH\n\nORDER DATED: 18.03.2024\n\n1. Issue notice. Learned Standing Counsel accepts notice on behalf of State.\n\n2. Learned counsel for Petitioner submits that the entire dispute arises from\na commercial contract. Let status report be filed within four weeks.\n\n3. Having regard to the submissions, it is directed that no coercive steps shall\nbe taken against the petitioner company or its directors till next date of hearing.\nPetitioner shall join the investigation as and when summoned in writing.\n\n4. List on 18.04.2025.\n\nPRATHIBA M. SINGH, J.\nMARCH 18, 2024`
];

// 3. Claim Statement Apex Infra
const claimText = [
  `BEFORE THE SOLE ARBITRATOR: HON'BLE MR. JUSTICE (RETD.) A. K. SIKRI\nIN ARBITRATION CASE NO. ARB-COMM-2023-104\n\nIN THE MATTER OF ARBITRATION BETWEEN:\nAPEX INFRASTRUCTURE LIMITED             ...CLAIMANT\nREGISTERED OFFICE: BKC, BANDRA EAST, MUMBAI\n\nAND\n\nMETRO RAIL CORPORATION LIMITED         ...RESPONDENT\nREGISTERED OFFICE: METRO BHAWAN, BARAKHAMBA ROAD, NEW DELHI\n\nSTATEMENT OF CLAIM ON BEHALF OF CLAIMANT\n\n1. The Claimant enters this Statement of Claim pursuant to Clause 18.2 of the\nEPC Contract Agreement No. MRCL/CIVIL/PKG-4/2020 dated 15.08.2020.\n\n2. The contract awarded to the Claimant was for the construction of 4 elevated\nviaduct stations for a total lump-sum contract price of INR 320 Crores.`,

  `SUMMARY OF CLAIMS\n\nCLAIM NO. 1: ESCALATION OF MATERIAL COSTS (STEEL & CEMENT)\nDue to respondent's delay of 420 days in handing over encumbrance-free Right of\nWay (ROW), raw material prices surged by 38.5%.\nAmount claimed: INR 24,50,00,000 (Twenty-four Crores Fifty Lakhs).\n\nCLAIM NO. 2: WRONGFUL IMPOSITION OF LIQUIDATED DAMAGES\nRespondent illegally withheld Milestone-3 retention payments of INR 18,30,00,000.\n\nTOTAL CLAIM:\nINR 42,80,00,000 (Forty-two Crores Eighty Lakhs) along with 12% per annum\ninterest pendente-lite and future interest until final realization.`
];

fs.writeFileSync(path.join(uploadsDir, 'Writ_Petition_Anand_Tech_Quashing.pdf'), createSimplePdf(writPetitionText));
fs.writeFileSync(path.join(uploadsDir, 'Interim_Order_Protection_18Mar2024.pdf'), createSimplePdf(orderText));
fs.writeFileSync(path.join(uploadsDir, 'Claim_Statement_Apex_Infra_Arbitration.pdf'), createSimplePdf(claimText));

console.log('✅ [PDF Generator]: Synthetic demo PDFs successfully generated in storage/uploads/');
