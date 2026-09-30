import { instrumentRules } from '../src/rules';
import fs from 'fs';
import path from 'path';

export function generateUnverifiedRulesDoc() {
  const unverified = Object.values(instrumentRules).filter(r => !r.verified);
  let md = '# RULES TO VERIFY\n\nThe following rules have not been verified against the primary legal text:\n\n';
  unverified.forEach(r => {
    md += `- **${r.label}** (Code: ${r.code}): ${r.sourceNote}\n`;
  });
  
  const dest = path.join(process.cwd(), '../../docs/RULES_TO_VERIFY.md');
  fs.writeFileSync(dest, md);
  console.log('RULES_TO_VERIFY.md generated');
}

generateUnverifiedRulesDoc();
