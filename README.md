# Timer PWA
キッチンタイマーにストップボタンは要らないですよね
1回ピピッって鳴れば充分で、いちいち止めに行く動作が邪魔になりますよね
という問題を解決したくて作ったタイマーです

iPhoneのホーム画面に追加するとネイティブアプリのように使えますが
ブラウザ版を無理やりアプリっぽくしてるだけなので、バックグラウンドで動かないです（画面開いてる状態じゃないと音鳴らない）

今度ひまだったらアプリ化してみます

## 追加したファイル

- `manifest.json` - PWAマニフェスト
- `sw.js` - Service Worker（オフライン起動とキャッシュ）
- `README.md` - 使い方
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

## iPhone でのインストール手順

1. Safari で GitHub Pages の公開 URL を開く
   https://yukingdom9.github.io/timer/
3. 画面下部の共有ボタンをタップ
4. 「ホーム画面に追加」を選択
5. タイトルを確認して追加
6. 追加したアイコンから起動すると、スタンドアロン表示になるはずです

## オフライン対応

- 初回アクセス後に Service Worker が登録され、主要ファイルをキャッシュします
- 2回目以降はオフラインでも `index.html` を返すように構成

## 注意

- iOS Safari ではホーム画面追加後に完全な PWA 表示になるまでに多少時間がかかることがあります
- `apple-touch-icon` を PNG 形式で用意すると、ホーム画面のアイコン品質が向上します
