# Mobile (Expo)

## npm workspaces / モノレポ

`babel-preset-expo` はルートの `node_modules` にホイストされる一方、`expo-router` が `mobile/node_modules` にしかないと、`babel-preset-expo` 内の `hasModule('expo-router')` が失敗し、`_ctx.*.js` の `require.context` が変換されずビルドエラーになります。

**対策:** リポジトリルートの `package.json` に `expo-router` を `devDependencies` で宣言し、ルートからも解決できるようにしています。バージョンは `mobile/package.json` の `expo-router` と揃えてください。

### React のバージョン（モノレポでは必ず揃える）

- **二重インストール:** `mobile` が `react@19.1.0`、ルートの `expo-router` だけ `react@19.2.x` などだと、`useEffect` が `null` になる **Invalid hook call** が出ます。
- **RN レンダラー:** `react@19.2.x` は React Native 0.81 / Expo SDK 54 が想定する組み合わせとずれ、`RendererImplementation` の `findNodeHandle` で **`Cannot read property 'default' of undefined`** になることがあります。

**対策:** リポジトリルートの `package.json` の `overrides` で `react` / `react-dom` / `react-test-renderer` を **19.1.0** に固定し、`frontend` / `mobile` の宣言も同じにしています。`expo-router` を上げたときも `npx expo install react react-dom` で Expo の推奨に合わせ、必要なら `overrides` を更新してください。

### 新アーキテクチャ（Fabric）

`app.json` の `newArchEnabled` は、レンダラー周りの不具合を避けるため **false** にしています。ネイティブを既に新アーキでビルドしている場合は、`npx expo prebuild --clean` 後に iOS/Android を作り直してください。

## 起動

```bash
cd mobile && npm run start
# または
npx expo start --clear
```
