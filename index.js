console.clear();
const { spawn } = require("child_process");
const express = require("express");
const app = express();
const chalk = require('chalk');
const logger = require("./main/utility/logs.js");
const fs = require('fs-extra')
const path = require('path');
const port = 8090 || 9000 || 5555 || 5050 || 5000 || 3003 || 2000 || 1029 || 1010;

console.log(chalk.blue('LOADING MAIN SYSTEM'));
logger(`loading app on port ${chalk.blueBright(port)}`, "load");
app.use(express.json());
app.use(express.static('main/webpage'));
app.post('/login', (req, res) => {
  const { loginPassword } = req.body;
  
  fs.readFile('config.json', 'utf8', (err, data) => {
    if (err) {
      console.error(err);
      return res.status(500).send('an error occurred.');
    }
    const config = JSON.parse(data);
    if (loginPassword === config.adminpass) {
      const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
      res.send({ token });
    } else {
      res.status(401).send('invalid admin password.');
    }
  });
});
app.get('/create', (req, res) => {
    const token = req.query.token; 
    
    if (token && token === localStorage.getItem('token')) { 
        res.sendFile(path.join(__dirname, 'main/webpage/create.html'));
    } else {
        res.status(401).send('Unauthorized');
    }
});
app.post('/create', (req, res) => {
    const fileName = req.body.fileName;
    const appState = req.body.appState;
    const filePath = path.join(__dirname, '../../states/'+fileName + '.json'); 
    const fileContent = appState;

    fs.writeFile(filePath, fileContent, (err) => {
        if (err) {
            console.error(err);
            return res.status(500).send('error creating appstate file.');
        }
        res.send('appstate file created successfully!');
    });
});
app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});
function startBot(message) {
    (message) ? console.log(chalk.blue(message.toUpperCase())) : "";

  const child = spawn("node", ["--trace-warnings", "--async-stack-traces", "--no-warnings", "main.js"], {
        cwd: __dirname,
        stdio: "inherit",
        shell: true
    });
  child.on("close", (codeExit) => {
        if (codeExit != 0 || global.countRestart && global.countRestart < 5) {
            startBot("restarting server");
            global.countRestart += 1;
            return;
        } else return;
    });

  child.on("error", function(error) {
    logger("an error occurred : " + JSON.stringify(error), "error");
  });
};
startBot();