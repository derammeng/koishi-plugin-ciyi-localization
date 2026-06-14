const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const CONFIGS = {
    1: { name: 'SAFE', batch: 0 },
    2: { name: 'BALANCED', batch: 5000 },
    3: { name: 'FAST', batch: 20000 }
};

console.log("请选择迁移模式:");
console.log("1. SAFE     (batch=0)     内存占用最低，逐条写入，最稳，速度慢");
console.log("2. BALANCED (batch=5000)  内存适中，分批写入，推荐");
console.log("3. FAST     (batch=20000) 内存占用最高，大批次写入，极限速度 (16GB内存推荐)");

rl.question("输入数字 (1-3): ", (answer) => {
    const config = CONFIGS[answer];
    if (!config) {
        console.log("输入错误，请重新运行脚本。");
        process.exit(1);
    }
    
    rl.close();
    startMigration(config);
});

function startMigration(config) {
    const db = new sqlite3.Database('lexicon.db');
    const dir = path.join(__dirname, 'data', 'ciyi');
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.txt'));

    console.log(`已选择: ${config.name} 模式，开始处理 ${files.length} 个文件...`);

    db.serialize(() => {
        db.run("PRAGMA journal_mode = OFF");
        db.run("PRAGMA synchronous = OFF");
        db.run("CREATE TABLE IF NOT EXISTS lexicon (word TEXT PRIMARY KEY, meaning TEXT)");

        const stmt = db.prepare("INSERT OR REPLACE INTO lexicon VALUES (?, ?)");
        
        if (config.batch > 0) db.run("BEGIN TRANSACTION");

        let count = 0;
        for (const f of files) {
            const word = path.basename(f, '.txt');
            const content = fs.readFileSync(path.join(dir, f), 'utf-8');
            
            stmt.run(word, content);
            count++;

            if (config.batch > 0 && count % config.batch === 0) {
                db.run("COMMIT");
                db.run("BEGIN TRANSACTION");
                process.stdout.write(`Progress: ${count}/${files.length}\r`);
            }
        }

        stmt.finalize(() => {
            if (config.batch > 0) db.run("COMMIT");
            console.log(`\n迁移完成。总计: ${count}`);
            db.close();
        });
    });
}
