はい、マークダウンなしのテキストでまとめます。

---

Claude Desktop とプロジェクトを連携する

MCP（Model Context Protocol）の Filesystem サーバーを使うことで、Claude Desktop からこのフォルダ内のファイルを読み書きできます。

前提条件として、Claude Desktop がインストール済みであること、Node.js が入っていて npx --version がターミナルで通ることを確認してください。

セットアップ手順

1. 設定ファイルを開く

Claude Desktop を起動し、メニューバーから Claude → Settings… を開きます。Developer タブを選択し、Edit Config をクリックすると claude_desktop_config.json がエディタで開きます。

2. MCP サーバーを追加する

以下の内容を参考に mcpServers を追加してください。パスはこのリポジトリの実際の場所に書き換えてください。

    {
      "mcpServers": {
        "kairos": {
          "command": "npx",
          "args": [
            "-y",
            "@modelcontextprotocol/server-filesystem",
            "/Users/あなたのユーザー名/developer/kairos"
          ]
        }
      }
    }

既に別の mcpServers がある場合は、"kairos": { ... } の部分だけを既存のオブジェクト内に追記し、設定全体を上書きしないよう注意してください。

3. Claude Desktop を再起動する

Claude Desktop をメニューバーのアイコンから完全に終了し、再度起動します。

4. 動作確認

新しいチャットを開き、ツール一覧に kairos または filesystem 系のツールが表示されていれば成功です。

注意事項

.env ファイルにはAPIキーなどの秘密情報が含まれます。Claude に渡したくない場合は、MCP の許可パスをサブディレクトリに限定するか、.env の内容を会話に貼らないようにしてください。リポジトリルートの CLAUDE.md にプロジェクト概要が書かれています。作業開始時に Claude に読ませると文脈を把握しやすくなります。

参考リンク

MCP Filesystem サーバー: https://github.com/modelcontextprotocol/servers/tree/main/src/filesystem
設定ファイルの場所（macOS）: ~/Library/Application Support/Claude/claude_desktop_config.json
