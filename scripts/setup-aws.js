#!/usr/bin/env node
/**
 * Script to test AWS Rekognition credentials
 * Usage: node scripts/setup-aws.js
 */

const readline = require('readline');
const fs = require('fs');
const path = require('path');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function testAWSCredentials(accessKeyId, secretAccessKey, region) {
  try {
    const { RekognitionClient, ListCollectionsCommand } = require('@aws-sdk/client-rekognition');

    const client = new RekognitionClient({
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });

    const command = new ListCollectionsCommand({});
    const response = await client.send(command);

    return { success: true, collections: response.CollectionIds || [] };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      code: error.code
    };
  }
}

async function main() {
  console.log('\n🚀 Configuration AWS Rekognition pour Focus Racer\n');

  const region = await question('Région AWS (défaut: eu-west-1): ') || 'eu-west-1';
  const accessKeyId = await question('AWS Access Key ID (commence par AKIA...): ');
  const secretAccessKey = await question('AWS Secret Access Key: ');

  if (!accessKeyId || !secretAccessKey) {
    console.error('❌ Access Key ID et Secret Access Key sont requis');
    rl.close();
    process.exit(1);
  }

  console.log('\n🔍 Test de connexion AWS Rekognition...\n');

  const result = await testAWSCredentials(accessKeyId, secretAccessKey, region);

  if (result.success) {
    console.log('✅ Connexion AWS réussie !');
    console.log(`📦 Collections Rekognition trouvées: ${result.collections.length}`);
    if (result.collections.length > 0) {
      console.log(`   - ${result.collections.join('\n   - ')}`);
    }

    // Update .env file
    const envPath = path.join(__dirname, '..', '.env');
    let envContent = '';

    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8');
    }

    // Update or add AWS variables
    const updates = {
      'AWS_REGION': region,
      'AWS_ACCESS_KEY_ID': accessKeyId,
      'AWS_SECRET_ACCESS_KEY': secretAccessKey,
      'AWS_REKOGNITION_COLLECTION_ID': 'focusracer-faces',
    };

    for (const [key, value] of Object.entries(updates)) {
      const regex = new RegExp(`^${key}=.*$`, 'm');
      if (regex.test(envContent)) {
        envContent = envContent.replace(regex, `${key}="${value}"`);
      } else {
        envContent += `\n${key}="${value}"`;
      }
    }

    fs.writeFileSync(envPath, envContent);
    console.log('\n✅ Fichier .env mis à jour localement');

    console.log('\n📋 Variables à configurer sur Render:');
    console.log('─'.repeat(60));
    for (const [key, value] of Object.entries(updates)) {
      console.log(`${key}=${value}`);
    }
    console.log('─'.repeat(60));

    console.log('\n🎯 Prochaines étapes:');
    console.log('1. Va sur dashboard.render.com');
    console.log('2. Clique sur "focus-racer" (Web Service)');
    console.log('3. Onglet "Environment"');
    console.log('4. Copie-colle les variables ci-dessus');
    console.log('5. Clique sur "Save Changes"');
    console.log('6. Render va redéployer automatiquement\n');

  } else {
    console.error('❌ Échec de connexion AWS');
    console.error(`   Code: ${result.code}`);
    console.error(`   Erreur: ${result.error}`);
    console.error('\n💡 Vérifiez:');
    console.error('   - Les clés sont correctes');
    console.error('   - L\'utilisateur IAM a les permissions Rekognition');
    console.error('   - La région est correcte\n');
  }

  rl.close();
}

main().catch(console.error);
