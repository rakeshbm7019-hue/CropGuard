const fs = require('fs');
let content = fs.readFileSync('src/components/FarmerAuthGate.tsx', 'utf8');
content = content.replace('\\n  const handleRegisterAndSubmit = async (e: React.FormEvent) => {', '\n  const handleRegisterAndSubmit = async (e: React.FormEvent) => {');
fs.writeFileSync('src/components/FarmerAuthGate.tsx', content);
