import { extractCvData } from '../server/utils/extractCvData.js';

const mockResumeText = `
John Doe
Software Engineer
john.doe@email.com | +1 (123) 456-7890
Location: San Francisco, CA

EXPERIENCE
Lead Software Engineer | Acme Corp (2020 - Present)
- Built next-gen AI processing engines and improved API performance by 40%.
- Managed a team of 5 engineers in deploying multi-tenant microservices.

EDUCATION
B.S. in Computer Science | Stanford University (2016 - 2020)

SKILLS
React, Node.js, TypeScript, PostgreSQL, AWS, Git, REST APIs
`;

const mockInvoiceText = `
INVOICE
Acme Utilities
Invoice Date: May 20, 2026
Due Date: June 20, 2026
Bill To: John Doe
Description: Monthly high-speed fiber internet subscription.
Total Due: $89.99
Thank you for your business! Please pay online or by phone.
`;

const mockArticleText = `
The Majestic Redwoods of Northern California

Northern California is home to some of the tallest living trees on Earth: the Coast Redwoods (Sequoia sempervirens). 
These magnificent giants can live for over 2,000 years and grow to heights exceeding 350 feet. 
Visitors from all over the world travel to locations like Redwood National and State Parks to walk among these ancient sentinels. 
The unique coastal fog of the region provides these trees with the essential moisture they need during the dry summer months. 
Preserving these forests is crucial for the regional ecosystem, as they provide habitat for a vast array of wildlife, 
including the endangered marbled murrelet and northern spotted owl. Hiking trails wind through the moist, fern-covered forest floors, 
creating a magical and serene atmosphere for adventurers.
`;

const mockTrickyArticleText = `
Northern California Giants
Written by Jane Miller (jane.miller@email.com)

Redwood trees are extremely tall. They grow along the coast of California.
I spent my summer vacation visiting these beautiful forests.
The fog was amazing and the trees are hundreds of feet tall.
I really love nature and recommend that everyone visits Redwood State Park.
`;

console.log("=== Running Resume Parsing & Verification Tests ===");

console.log("\nTesting Mock Resume:");
const parsedResume = extractCvData(mockResumeText);
console.log("Result isResume:", parsedResume.isResume);
console.log("Result invalidReason:", parsedResume.invalidReason || "None");

console.log("\nTesting Mock Utility Bill/Invoice (Short):");
const parsedInvoice = extractCvData(mockInvoiceText);
console.log("Result isResume:", parsedInvoice.isResume);
console.log("Result invalidReason:", parsedInvoice.invalidReason);

console.log("\nTesting Mock Article (Long, No Contact):");
const parsedArticle = extractCvData(mockArticleText);
console.log("Result isResume:", parsedArticle.isResume);
console.log("Result invalidReason:", parsedArticle.invalidReason);

console.log("\nTesting Mock Tricky Article (Long, With Contact, No Sections):");
const parsedTrickyArticle = extractCvData(mockTrickyArticleText);
console.log("Result isResume:", parsedTrickyArticle.isResume);
console.log("Result invalidReason:", parsedTrickyArticle.invalidReason);

if (
  parsedResume.isResume === true && 
  parsedInvoice.isResume === false && 
  parsedArticle.isResume === false &&
  parsedTrickyArticle.isResume === false
) {
  console.log("\n✅ SUCCESS: Validation logic correctly separated all test cases!");
} else {
  console.log("\n❌ FAILED: Validation logic did not correctly separate all test cases.");
}
