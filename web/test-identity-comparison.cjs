const fs = require('fs');
const path = require('path');

// 1. Load CSVs
const acctCsvPath = path.resolve(__dirname, '../data/accounts.csv');
const txnCsvPath = path.resolve(__dirname, '../data/transactions.csv');

const acctLines = fs.readFileSync(acctCsvPath, 'utf8').trim().split('\n');
const headers = acctLines[0].split(',');

const accounts = [];
for (let i = 1; i < acctLines.length; i++) {
  const parts = acctLines[i].split(',');
  if (parts.length >= headers.length) {
    accounts.push({
      account_id: parts[0],
      opened_date: parts[1],
      kyc_phone_hash: parts[5],
      kyc_address_hash: parts[6],
      kyc_pan_hash: parts[7],
      device_ids: parts[8] ? parts[8].split(';') : [],
      ip_addresses: parts[9] ? parts[9].split(';') : [],
    });
  }
}

console.log(`Loaded ${accounts.length} accounts from CSV.`);

// Pick 3 test accounts:
// 1. ACC-000003 (shares device D-0071 with ACC-000004 and ACC-000009)
// 2. ACC-000000 (shares address AD-000285 with ACC-000015)
// 3. ACC-RING01-04 (circular ring, shares PH-MULE-001, D-MULE-001, 10.0.1.1 with ACC-RING01-00..05)
const testAccountIds = ['ACC-000003', 'ACC-000000', 'ACC-RING01-04'];

const comparisonResults = [];

for (const targetId of testAccountIds) {
  const target = accounts.find((a) => a.account_id === targetId);
  if (!target) {
    console.error(`Account ${targetId} not found!`);
    continue;
  }

  // Ground truth computation from CSV
  const samePhone = accounts.filter(
    (a) => a.account_id !== targetId && a.kyc_phone_hash && a.kyc_phone_hash === target.kyc_phone_hash
  );

  const sameAddress = accounts.filter(
    (a) => a.account_id !== targetId && a.kyc_address_hash && a.kyc_address_hash === target.kyc_address_hash
  );

  const targetDevices = new Set(target.device_ids);
  const sameDevice = accounts.filter(
    (a) => a.account_id !== targetId && a.device_ids.some((d) => targetDevices.has(d))
  );

  const targetIps = new Set(target.ip_addresses);
  const sameIp = accounts.filter(
    (a) => a.account_id !== targetId && a.ip_addresses.some((ip) => targetIps.has(ip))
  );

  const res = {
    account_id: targetId,
    ground_truth: {
      phone_shared_count: samePhone.length,
      phone_peers: samePhone.map((a) => a.account_id),
      address_shared_count: sameAddress.length,
      address_peers: sameAddress.map((a) => a.account_id),
      device_shared_count: sameDevice.length,
      device_peers: sameDevice.map((a) => a.account_id),
      ip_shared_count: sameIp.length,
      ip_peers: sameIp.map((a) => a.account_id),
    },
  };

  comparisonResults.push(res);
  console.log(`\nAccount: ${targetId}`);
  console.log(`  Shared Phone Peers (${samePhone.length}):`, samePhone.map((a) => a.account_id));
  console.log(`  Shared Address Peers (${sameAddress.length}):`, sameAddress.map((a) => a.account_id));
  console.log(`  Shared Device Peers (${sameDevice.length}):`, sameDevice.map((a) => a.account_id));
  console.log(`  Shared IP Peers (${sameIp.length}):`, sameIp.map((a) => a.account_id));
}

// Write comparison report artifact
fs.writeFileSync(
  path.resolve(__dirname, '../docs/identity-ground-truth-comparison.json'),
  JSON.stringify(comparisonResults, null, 2)
);

console.log('\n✓ Ground truth comparison written to docs/identity-ground-truth-comparison.json');
