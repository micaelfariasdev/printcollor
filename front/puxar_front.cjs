const fs = require('fs');
const path = require('path');

// Nome do ficheiro de saída
const outputFile = 'contexto_front_completo.txt';

// Configurações: pastas a ignorar e extensões permitidas
const ignoreList = ['node_modules', 'dist', '.git', '.next', 'build', 'public', 'assets', 'package-lock.json'];
const validExtensions = ['.ts', '.tsx', '.js', '.jsx', '.css', '.json', '.html'];

function getAllFiles(dirPath, arrayOfFiles) {
  const files = fs.readdirSync(dirPath);

  arrayOfFiles = arrayOfFiles || [];

  files.forEach(function(file) {
    const fullPath = path.join(dirPath, file);
    
    // Verifica se a pasta deve ser ignorada
    if (fs.statSync(fullPath).isDirectory()) {
      if (!ignoreList.includes(file)) {
        arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
      }
    } else {
      // Verifica se a extensão é válida
      const ext = path.extname(file);
      if (validExtensions.includes(ext) && !ignoreList.includes(file)) {
        arrayOfFiles.push(fullPath);
      }
    }
  });

  return arrayOfFiles;
}

function gerarContexto() {
  console.log('🚀 A ler ficheiros do frontend...');
  
  const allFiles = getAllFiles('.');
  let stream = fs.createWriteStream(outputFile, { flags: 'w', encoding: 'utf8' });

  allFiles.forEach(filePath => {
    const content = fs.readFileSync(filePath, 'utf8');
    
    stream.write(`\n${'='.repeat(50)}\n`);
    stream.write(`ARQUIVO: ${filePath}\n`);
    stream.write(`${'='.repeat(50)}\n\n`);
    stream.write(content);
    stream.write('\n');
  });

  stream.end();
  console.log(`✅ Sucesso! Ficheiro gerado: ${outputFile}`);
}

gerarContexto();