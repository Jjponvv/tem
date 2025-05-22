const vscode = require("vscode");
const fs = require("fs");
const path = require("path");
const os = require("os");

const templatesDir = path.join(os.homedir(), ".tem");
const templatesPath = path.join(templatesDir, "templates.json");

function loadTemplates() {
  if (!fs.existsSync(templatesPath)) return [];

  return JSON.parse(fs.readFileSync(templatesPath, "utf-8"));
}

function saveTemplates(templates) {
  if (!fs.existsSync(templatesDir))
    fs.mkdirSync(templatesDir, { recursive: true });

  fs.writeFileSync(templatesPath, JSON.stringify(templates, null, 2));
}

function getWebviewContent() {
  return `<!DOCTYPE html>
	<html lang="en">
	<head>
		<meta charset="UTF-8">
		<meta name="viewport" content="width=device-width, initial-scale=1.0">
		<title>Document</title>
        <style>
            body{
                background: #000;
                color: grey;
                font-family: 'Courier New', Courier, monospace;
                font-weight: 800;
            }
        </style>
	</head>
	<body>
		<h2>Template creator</h2>
		<label>Template name*:</label>
		<input type="text" id="name" style="border-radius: 6px; outline: none; text-decoration: none; margin: 10px;"/>
		<label><br>Template extension(like .py, .cpp, ...)*:</label>
		<input type="text" id="extension" style="border-radius: 6px; outline: none; text-decoration: none; margin: 10px;"/>
        <br>
		<textarea id="content" style="width: 700px; height: 700px; border-radius: 6px; outline: none; resize: none; user-select: text;" placeholder="// Type content here*"></textarea>
        <br>
		<button onclick="save()" style="border-radius: 6px; outline: none; background: #fff; color: grey; font-size: 24px; font-family: 'Courier New', Courier, monospace;">Save template</button>
		<script>
			const vscode = acquireVsCodeApi();
			function save()
			{
				const name = document.getElementById('name').value;
				const extension = document.getElementById('extension').value;
				const content = document.getElementById('content').value;
				vscode.postMessage({command: 'saveTemplate', name, extension, content});
			}
		</script>
	</body>
</html>`;
}

function activate(context) {
  context.subscriptions.push(
    vscode.commands.registerCommand("tem.createFromTemplate", async () => {
      const templates = loadTemplates();
      if (templates.length === 0)
        return vscode.window.showWarningMessage("No templates");

      const selected = await vscode.window.showQuickPick(
        templates.map((t) => t.name),
        {
          placeHolder: "Choose template",
        }
      );
      if (!selected) return;

      const tpl = templates.find((t) => t.name === selected);
      const fileName = await vscode.window.showInputBox({
        prompt: "Name for file: ",
      });
      if (!fileName) return;

      const folderUri = await vscode.window.showOpenDialog({
        canSelectFolders: true,
      });
      if (!folderUri || folderUri.length === 0) return;

      const filePath = path.join(folderUri[0].fsPath, fileName + tpl.extension);
      fs.writeFileSync(filePath, tpl.content);

      const doc = await vscode.workspace.openTextDocument(filePath);

      vscode.window.showTextDocument(doc);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("tem.addTemplate", () => {
      const panel = vscode.window.createWebviewPanel(
        "addTemplate",
        "Add template",
        vscode.ViewColumn.One,
        { enableScripts: true }
      );

      panel.webview.html = getWebviewContent();

      panel.webview.onDidReceiveMessage((message) => {
        if (message.command === "saveTemplate") {
          const { name, extension, content } = message;
          if (!name || !extension || !content) {
            return;
          }
          const templates = loadTemplates();
          templates.push({ name, extension, content });
          saveTemplates(templates);
          panel.dispose();
        }
		vscode.window.showInformationMessage('Template saved');
      });
    })
  );

  context.subscriptions.push(vscode.commands.registerCommand("tem.editTemplate", async () => {
      const templates = loadTemplates();
      const selected = await vscode.window.showQuickPick(
        templates.map((t) => t.name),
        { prompt: "Choose template to edit" }
      );
      const panel = vscode.window.createWebviewPanel(
        "editTemplate",
        "Edit template",
        vscode.ViewColumn.One,
        { enableScripts: true }
      );

      panel.webview.html = getWebviewContent();

      panel.webview.onDidReceiveMessage((message) => {
        if (message.command === "saveTemplate") {
          const { name, extension, content } = message;
          if (!name || !extension || !content) {
            return;
          }
          let tpl = templates.find((t) => t.name === selected);
          const index = templates.findIndex((t) => t.name === selected);
			if (index !== -1) {
				templates[index] = { name, extension, content };
				saveTemplates(templates);
			}
          panel.dispose();
        }
      })
	  vscode.window.showInformationMessage('Template updated');
	})
    );

  context.subscriptions.push(
    vscode.commands.registerCommand("tem.deleteTemplate", async () => {
      let templates = loadTemplates();
      if (templates.length === 0) return;

      const selected = await vscode.window.showQuickPick(
        templates.map((t) => t.name),
        {
          placeHolder: "Choose template to delete",
        }
      );
      if (!selected) return;

      templates = templates.filter((t) => t.name !== selected);
      saveTemplates(templates);
	  vscode.window.showInformationMessage('Template deleted');
    })
  );
}

function deactivate() {}

module.exports = {
  activate,
  deactivate,
};
