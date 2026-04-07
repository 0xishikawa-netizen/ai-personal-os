# Claude Desktop で MCP を繋ぐ手順（kairos のみ）

Claude Desktop に MCP（Model Context Protocol）の **filesystem** サーバーを登録すると、チャットからこのリポジトリ内のファイルを読み書きできます。

## 前提

- [Claude Desktop](https://claude.ai/download) がインストール済み
- Node.js が入り、ターミナルで `npx --version` が通ること

## 手順

### 1. 設定ファイルを開く

1. **Claude Desktop** を起動する  
2. メニュー **Claude → Settings…**（設定）  
3. **Developer** を開く  
4. **Edit Config** をクリックする  

エディタで `claude_desktop_config.json` が開きます。

**直接開く場合（macOS）**

- パス: `~/Library/Application Support/Claude/claude_desktop_config.json`  
- Finder で **移動 → フォルダへ移動** に上記を貼り付けても開けます。

### 2. JSON の形を確認する

トップレベルは有効な JSON にします。

```json
{
  "mcpServers": { },
  "preferences": { }
}
```

- **`preferences`**: Claude Desktop の UI 設定（任意）。リポジトリの例ファイルと同じ内容でよいです。  
すでに `mcpServers` がある場合は、`kairos` のエントリだけ**追記**し、カンマで区切って JSON が壊れないようにしてください。

### 3. `kairos` を書き込む

リポジトリ直下の **`claude-desktop.mcp.example.json`** の内容をコピーし、`claude_desktop_config.json` の `mcpServers` にマージします。

**必ず直す箇所**: `kairos` の `args` の**最後の要素**を、このリポジトリの**実際の絶対パス**に変更する（例: `/Users/あなたの名前/developer/kairos`）。

**例（`kairos` + `preferences`）**

```json
{
  "mcpServers": {
    "kairos": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-filesystem",
        "/Users/ishikawatatsuya/developer/kairos"
      ]
    }
  },
  "preferences": {
    "coworkScheduledTasksEnabled": false,
    "ccdScheduledTasksEnabled": false,
    "sidebarMode": "chat",
    "coworkWebSearchEnabled": true
  }
}
```

### 4. 保存して Claude を再起動

1. `claude_desktop_config.json` を保存（JSON の文法ミスがないか確認）  
2. メニューバーの **Claude → Quit** で**完全終了**  
3. 再度 **Claude Desktop** を起動  

### 5. 繋がったか確認する

新しいチャットを開き、ツール一覧に **filesystem** 系（`read_file` / `write_file` など）が **`kairos` 経由**で出ていれば成功です。Developer タブに MCP の状態やログがあれば、エラーがないかも確認してください。

## うまくいかないとき

| 症状 | 確認すること |
|------|----------------|
| ツールが出ない | JSON の文法、`mcpServers` のキー、**完全終了→再起動** |
| npx が失敗 | ターミナルで `npx -y @modelcontextprotocol/server-filesystem --help`、ネットワーク |
| パス違い | `args` の最後がリポジトリの実パスと一致しているか |

## 注意（秘密情報）

`.env` に API キーなどが入ります。MCP でリポジトリ全体を許可していると Claude がファイルを読めます。必要なら許可パスをサブフォルダに限定するか、`.env` を会話に貼らないようにしてください。

プロジェクト概要はリポジトリルートの **`CLAUDE.md`** にあります。

## 参考リンク

- MCP Filesystem サーバー: https://github.com/modelcontextprotocol/servers/tree/main/src/filesystem  
- 設定ファイル（macOS）: `~/Library/Application Support/Claude/claude_desktop_config.json`  
