# Timer PWA

このリポジトリには、iPhoneのホーム画面に追加してネイティブアプリのように使えるタイマーWebアプリが含まれています。

## 追加したファイル

- `manifest.json` - PWAマニフェスト
- `sw.js` - Service Worker（オフライン起動とキャッシュ）
- `README.md` - 使い方とGitHub Pages手順
- `scripts/generate-icons.py` - PWAアイコン生成スクリプト
- `icons/icon.svg` - PWA用アイコンのプレースホルダ
- `icons/apple-touch-icon.svg` - iPhone用アイコンのプレースホルダ

## 変更内容

- `index.html` に PWA 用 meta タグと manifest リンクを追加
- iOS Safari の `apple-mobile-web-app-capable` / `black-translucent` を設定
- `theme-color` を設定してアドレスバーやステータスバーに対応
- `env(safe-area-inset-*)` を使って iPhone X 系などのセーフエリアに対応
- Service Worker による `index.html` / `manifest.json` / `sw.js` / アイコンのキャッシュ
- ユーザー操作後の `AudioContext` 有効化を実装
- `standalone` 表示対応でホーム画面追加時にフルスクリーン表示を目指す

## GitHub Pages への反映方法

1. リポジトリを GitHub にプッシュ
2. GitHub のリポジトリ設定で `Pages` を開く
3. `Source` に `main` / `master` または `gh-pages` を選択し、`./` を公開
4. 実際のURLで `index.html` にアクセスし、PWA が動作することを確認

### GitHub Pages での相対パス対応

`index.html` では `./manifest.json` や `./sw.js` を相対パスで指定しているため、プロジェクトページでも安全に動作します。

## iPhone でのインストール手順

1. Safari で GitHub Pages の公開 URL を開く
2. 画面下部の共有ボタンをタップ
3. 「ホーム画面に追加」を選択
4. タイトルを確認して追加
5. 追加したアイコンから起動すると、スタンドアロン表示になるはずです

## アイコンサイズ一覧

PWA と iOS で推奨されるアイコンサイズ例:

- 180x180 - iOS Apple Touch Icon
- 192x192 - Android PWA
- 256x256 - 一般的なWebアプリアイコン
- 512x512 - Chrome/Android PWA
- 120x120, 152x152, 167x167 - iOS 向け追加サイズ

`manifest.json` を更新して、PNG アイコンを追加する場合は上記サイズを用意してください。

## アイコン生成スクリプト

`pip install pillow` で Pillow をインストールし、次を実行すると `icons/` に PNG アイコンを生成します。

```bash
python scripts/generate-icons.py
```

生成後は `manifest.json` を必要に応じて PNG アイコンに書き換えてください。

## オフライン対応

- 初回アクセス後に Service Worker が登録され、主要ファイルをキャッシュします
- 2回目以降はオフラインでも `index.html` を返すように構成

## 注意

- iOS Safari ではホーム画面追加後に完全な PWA 表示になるまでに多少時間がかかることがあります
- `apple-touch-icon` を PNG 形式で用意すると、ホーム画面のアイコン品質が向上します
