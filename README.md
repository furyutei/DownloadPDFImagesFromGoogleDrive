DownloadPDFImagesFromGoogleDrive
================================

- License: The MIT license  
- Copyright (c) 2020 風柳(furyu)  
- 対象ブラウザ： Google Chrome、Firefox

[Google Drive](https://drive.google.com/) にて共有されている PDF ファイルの画像イメージを ZIP ファイルとしてダウンロード。  


■ インストール方法 
---
### ユーザースクリプト版
Google Chrome＋[Tampermonkey](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo?hl=ja) ／ Firefox＋[Tampermonkey](https://addons.mozilla.org/ja/firefox/addon/tampermonkey/) の環境で、  

> [DownloadPDFImagesFromGoogleDrive](https://furyutei.github.io/DownloadPDFImagesFromGoogleDrive/src/js/content.user.js)  
                                
をクリックし、指示に従ってインストール。  


■ 使い方
---
Google Drive の PDF ファイル共有ページ（[例](https://drive.google.com/open?id=1rYyvQGFRqLlLdQ5nUh1U8Ubx-DPEXMfV)）を開くと、上部に [Download ZIP] ボタンが挿入される。 
これをクリックすると、PDF ファイルの画像イメージが ZIP ファイルとしてダウンロードされる。  


■ 外部ライブラリなど
---
- [JSZip](https://stuk.github.io/jszip/)  
    Copyright (c) 2009-2016 Stuart Knightley, David Duponchel, Franz Buchinger, António Afonso  
    [The MIT License](https://github.com/Stuk/jszip/blob/master/LICENSE.markdown)  
