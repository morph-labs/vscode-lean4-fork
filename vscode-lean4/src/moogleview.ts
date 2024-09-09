import { Disposable, ViewColumn, WebviewPanel, commands, version, window } from 'vscode'
import { VSCodeAbbreviationConfig } from './abbreviation/VSCodeAbbreviationConfig'
import { FileUri } from './utils/exturi'

function escapeHtml(s: string) {
    return s
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;')
}

export class MoogleView implements Disposable {
    private subscriptions: Disposable[] = []

    constructor(
        private extensionPath: FileUri,
        private extensionVersion: string,
    ) {
        this.subscriptions.push(
            commands.registerCommand('lean4.moogle.search', async () => {
                let initialQuery: string | undefined
                if (window.activeTextEditor !== undefined && window.activeTextEditor.selection !== undefined) {
                    initialQuery = window.activeTextEditor.document.getText(window.activeTextEditor.selection)
                }
                await this.display(initialQuery)
            }),
        )
    }

    async display(initialQuery?: string | undefined) {
        let column =
            window.activeTextEditor && window.activeTextEditor?.viewColumn
                ? window.activeTextEditor?.viewColumn + 1
                : ViewColumn.Two
        if (column === 4) {
            column = ViewColumn.Three
        }
        const webviewPanel = window.createWebviewPanel(
            'lean4_moogleview',
            'MoogleView',
            { viewColumn: column },
            {
                enableScripts: true,
                enableFindWidget: true,
                retainContextWhenHidden: true,
                enableCommandUris: true,
            },
        )

        webviewPanel.webview.html = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8" />
                <meta http-equiv="Content-type" content="text/html;charset=utf-8">
                <meta
                    http-equiv="Content-Security-Policy"
                    content="
                    default-src 'self' ${webviewPanel.webview.cspSource} https://loogle.lean-lang.org https://moogle.ai https://www.moogle.ai https://morph-cors-anywhere.pranavnt.workers.dev;
                    script-src 'self' ${webviewPanel.webview.cspSource} 'nonce-inline';
                    style-src 'self' ${webviewPanel.webview.cspSource} 'unsafe-inline';
                    connect-src 'self' ${webviewPanel.webview.cspSource} https://loogle.lean-lang.org https://moogle.ai https://www.moogle.ai https://morph-cors-anywhere.pranavnt.workers.dev;
                    "
                />
                <title>MoogleView</title>
                <script defer type="module" nonce="inline">
                    document.getElementById("moogleviewRoot").innerHTML = await (await fetch("${this.webviewUri(webviewPanel, 'dist', 'moogleview', 'static', 'index.html')}")).text()
                </script>
                <link rel="stylesheet" href="${this.webviewUri(webviewPanel, 'dist', 'moogleview', 'static', 'index.css')}">
                <link rel="stylesheet" href="${this.webviewUri(webviewPanel, 'dist', 'moogleview', 'static', 'codicons', 'codicon.css')}">
            </head>
            <body>
                <div id="moogleviewRoot" style="min-width: 50em"></div>
                <script defer
                    nonce="inline"
                    src="${this.webviewUri(webviewPanel, 'dist/moogleview.js')}"
                    data-id="moogleview-script"
                    abbreviation-config="${escapeHtml(JSON.stringify(new VSCodeAbbreviationConfig()))}"
                    initial-query="${escapeHtml(initialQuery ?? '')}"
                    vscode-version="${escapeHtml(version)}"
                    extension-version="${escapeHtml(this.extensionVersion)}"></script>
            </body>
            </html>`
        webviewPanel.reveal()
    }

    webviewUri(webviewPanel: WebviewPanel, ...pathSegments: string[]): string | undefined {
        const uri = webviewPanel.webview.asWebviewUri(this.extensionPath.join(...pathSegments).asUri())
        return uri.toString()
    }

    dispose() {
        for (const s of this.subscriptions) {
            s.dispose()
        }
    }
}
