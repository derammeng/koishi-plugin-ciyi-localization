// merge.js
const fs = require('fs');
const fsPromises = require('fs/promises');
const path = require('path');

async function main() {
  const dirPath = path.join(__dirname, 'data', 'ciyi'); 
  const outputPath = path.join(__dirname, 'plugins', 'koishi-plugin-ciyi-localization', 'data', 'lexicon.json');
  
  await fsPromises.mkdir(path.dirname(outputPath), { recursive: true });
  
  console.log('正在读取词库目录...');
  const files = await fsPromises.readdir(dirPath);
  const txtFiles = files.filter(f => f.endsWith('.txt'));
  console.log(`总共发现 ${txtFiles.length} 个文本文件，开始合并...`);

  const writeStream = fs.createWriteStream(outputPath, { encoding: 'utf-8' });
  
  writeStream.write('{\n');

  for (let i = 0; i < txtFiles.length; i++) {
    const file = txtFiles[i];
    const word = path.basename(file, '.txt');
    const filePath = path.join(dirPath, file);
    
    const content = await fsPromises.readFile(filePath, 'utf-8');
    
    const safeContent = content.trim()
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r');

    const isLast = i === txtFiles.length - 1;
    const jsonLine = `  "${word}": "${safeContent}"${isLast ? '' : ',\n'}`;
    
    writeStream.write(jsonLine);

    if ((i + 1) % 5000 === 0) {
      console.log(`进度: 已处理 ${i + 1} / ${txtFiles.length} 个文件...`);
    }
  }

  writeStream.write('\n}');
  writeStream.end();

  writeStream.on('finish', () => {
    console.log('\n=========================================');
    console.log(`JSON 词库已生成`);
    console.log(`输出路径: ${outputPath}`);
    console.log('=========================================');
  });
}

main().catch(err => {
  if (err.code === 'ENOENT') {
    console.error(`\n❌ 错误：找不到词库目录！请检查路径是否为: ${err.path}`);
  } else {
    console.error('\n❌ 合并过程中发生错误:', err);
  }
});
