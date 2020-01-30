// ==UserScript==
// @name            Download PDF images from GoogleDrive
// @namespace       http://furyu.hatenablog.com/
// @author          furyu
// @version         0.1.0.2
// @include         https://drive.google.com/file/*/*/view*
// @require         https://cdnjs.cloudflare.com/ajax/libs/jszip/3.2.2/jszip.min.js
// @description     Download ZIP format PDF images from Google Drive
// ==/UserScript==

( async () => {
'use strict';

//{ 各種設定
const
    CONFIG = {
        DEFAULT_PAGE_WIDTH : 2480, // デフォルトページ幅(ピクセル) (A4: 210 x 297mm ・ 300 dpi → 2480 x 3508)
        // TODO: A4縦以外を考慮していない→ダウンロード時にユーザー指定可能とする
        MIN_PAGE_WIDTH : 596, // 最小ページ幅(ピクセル) (A4: 210 x 297mm ・ 72 dpi → 595 x 847)
        // ※ w=595 で指定しても 596 で返ってくるので、最小値は 596 ピクセルか？
        DOWNLOAD_BUTTON_TEXT : 'Download ZIP',
        DOWNLOAD_PROGRESS_TEXT_BASE : 'Downloading: #CURRENT# / #TOTAL#',
        ZIP_PROGRESS_TEXT : 'Creating ZIP ...',
    },
    
    SCRIPT_NAME = 'DownloadPDFimagesfromGoogleDrive';
//}

const
    viewerData = unsafeWindow.viewerData;

if ( ( ! viewerData ) || ( ! viewerData.itemJson ) || ( viewerData.itemJson[ 11 ] != 'application/pdf' ) ) {
    console.error( 'This page is not supported.' );
    return;
}

const
    get_one_google_bar = () => {
        let selectors = [
                'div#one-google-bar', // ユーザーアイコン
                '.ndfHFb-c4YZDc-mKZypf-bEDTcc', // [ログイン] ボタン
                // TODO: 今後セレクタが変わる可能性が高い
            ],
            one_google_bar,
            is_ready = one_google_bar => one_google_bar && ( getComputedStyle( one_google_bar.parentNode ).display != 'none' );
        
        for ( let selector of selectors ) {
            one_google_bar = document.querySelector( selector );
            
            if ( is_ready( one_google_bar ) ) {
                break;
            }
            one_google_bar = null;
        }
        
        return one_google_bar;
    },
    
    one_google_bar = await ( new Promise( ( resolve, reject ) => {
        let one_google_bar = get_one_google_bar();
        
        if ( one_google_bar ) {
            resolve( one_google_bar );
            return;
        }
        
        let observer = new MutationObserver( records => {
                one_google_bar = get_one_google_bar();
                
                if ( ! one_google_bar ) {
                    return;
                }
                
                observer.disconnect();
                resolve( one_google_bar );
            } );
        
        observer.observe( document.body, { childList : true, subtree : true } );
    } ) ),
    
    button_container = one_google_bar.parentNode,
    
    zero_padding = ( number, length ) => ( '000000000000000' + number ).slice( - length ),
    
    get_value = ( key ) => {
        return new Promise( ( resolve, reject ) => {
            resolve( localStorage.getItem( key ) );
        } );
    },
    
    set_value = ( key, value ) => {
        return new Promise( ( resolve, reject ) => {
            resolve( localStorage.setItem( key, value ) );
        } );
    },
    
    document_image_info = {},
    
    download_zip = async ( download_button ) => {
        if ( ! document_image_info.is_ready ) {
            await ( async () => {
                const
                    params_url = viewerData.itemJson[ 9 ], // TODO: 本当はこれに sp=... が続くが取得方法不明
                    
                    params = document_image_info.params = await fetch( params_url )
                        .then( response => response.text() )
                        .then( text => {
                            const
                                params = JSON.parse( text.replace( /^.*?'\s*/, '' ) );
                            
                            return params;
                        } )
                        .catch( error => {
                            console.error( 'fetch failure', params_url, error );
                            return null;
                        } );
                
                if ( params === null ) {
                    return;
                }
                
                const
                    meta_info_url = 'https://drive.google.com/viewerng/' + params.meta,
                    
                    meta_info = document_image_info.meta_info = await fetch( meta_info_url )
                        .then( response => response.text() )
                        .then( text => {
                            const
                                meta_info = JSON.parse( text.replace( /^.*?'\s*/, '' ) );
                            
                            return meta_info;
                        } )
                        .catch( error => {
                            console.error( 'fetch failure', meta_info_url, error );
                            return null;
                        } );
                
                if ( meta_info === null ) {
                    return;
                }
                
                document_image_info.is_ready = true;
            } )();
        }
        
        if ( ! document_image_info.is_ready ) {
            alert( 'Document image information could not be obtained.' );
            return;
        }
        
        const
            page_width = document_image_info.page_width = await ( async () => {
                let max_page_width = document_image_info.meta_info.maxPageWidth,
                    
                    page_width = await ( async () => {
                        let page_width = await get_value( SCRIPT_NAME + '-page_width' );
                        
                        if ( ( page_width === null ) || isNaN( page_width ) ) {
                            page_width = CONFIG.DEFAULT_PAGE_WIDTH;
                        }
                        else {
                            page_width = parseInt( page_width, 10 );
                        }
                        
                        return Math.min( max_page_width, page_width );
                    } )(),
                    
                    specified_page_width = prompt( 'Specify page width in pixels (' + CONFIG.MIN_PAGE_WIDTH + '~' + max_page_width + 'pixels)\ne.g. A4: 210x297mm -> 300dpi: 2480x3508', page_width );
                
                if ( specified_page_width === null ) {
                    return null;
                }
                
                specified_page_width = specified_page_width.trim().replace( /[\uff10-\uff19]/g, char => String.fromCharCode( char.charCodeAt( 0 ) - 0xfee0 ) );
                
                if ( isNaN( specified_page_width ) ) {
                    page_width = Math.min( max_page_width, CONFIG.DEFAULT_PAGE_WIDTH );
                }
                else {
                    specified_page_width = parseInt( specified_page_width, 10 );
                    
                    if ( ( CONFIG.MIN_PAGE_WIDTH <= specified_page_width ) && ( specified_page_width <= max_page_width ) ) {
                        page_width = specified_page_width;
                    }
                    else {
                        page_width = Math.min( max_page_width, CONFIG.DEFAULT_PAGE_WIDTH );
                    }
                }
                return page_width;
            } )();
        
        if ( page_width === null ) {
            return;
        }
        
        await set_value( SCRIPT_NAME + '-page_width', page_width );
        
        const
            image_url_base = 'https://drive.google.com/viewerng/' + document_image_info.params.img + '&page=#PAGE#&skiphighlight=true&w=' + page_width + '&webp=false',
            
            pdf_filename = viewerData.itemJson[ 1 ],
            
            zip_filename = pdf_filename.replace( /\.pdf$/, '' ) + '.zip',
            
            max_page_length = ( '' + document_image_info.meta_info.pages ).length,
            
            JSZip = window.JSZip;
        
        let zip = new JSZip(),
            
            image_file_infos = Array( document_image_info.meta_info.pages ).fill().map( ( _, page ) => {
                return {
                    page : page,
                    url : image_url_base.replace( /#PAGE#/, page ),
                    filename : zero_padding( 1 + page, max_page_length ) + '.png',
                };
            } ),
            
            blob = await ( async () => {
                if ( download_button ) {
                    download_button.textContent = CONFIG.DOWNLOAD_PROGRESS_TEXT_BASE.replace( /#CURRENT#/g, 0 ).replace( /#TOTAL#/g, document_image_info.meta_info.pages );
                }
                
                //zip.file( pdf_filename + '.url', '[InternetShortcut]\nURL=' + location.href + '\n' ); // TODO: 日本語ファイル名だとアーカイバによっては文字化けする
                zip.file( 'Source PDF.url', '[InternetShortcut]\nURL=' + location.href + '\n' );
                zip.file( 'viewerData.json', JSON.stringify( viewerData, null, 4 ) );
                
                // TODO: 逐次落としているので遅い（並列ダウンロードすると400が返ることがあるなど面倒なので未対応）
                for ( let image_file_info of image_file_infos ) {
                    if ( download_button ) {
                        download_button.textContent = CONFIG.DOWNLOAD_PROGRESS_TEXT_BASE.replace( /#CURRENT#/g, 1 + image_file_info.page ).replace( /#TOTAL#/g, document_image_info.meta_info.pages );
                    }
                    else {
                        console.log( 'Page ' + ( 1 + image_file_info.page ) + ' / ' + document_image_info.meta_info.pages, image_file_info.url );
                    }
                    await fetch( image_file_info.url )
                        .then( response => response.arrayBuffer() )
                        .then( data => {
                            zip.file( image_file_info.filename, data );
                        } )
                        .catch( error => {
                            console.error( 'Page ' + ( 1 + image_file_info.page ) , 'fetch failure', error, image_file_info.url );
                        } );
                }
                
                if ( download_button ) {
                    download_button.textContent = CONFIG.ZIP_PROGRESS_TEXT;
                }
                
                return await zip.generateAsync( { type : 'blob', compression: "STORE" } );
            } )(),
            
            download_link = document.createElement( 'a' );
        
        download_link.href = URL.createObjectURL( blob );
        download_link.download = zip_filename;
        document.documentElement.appendChild( download_link );
        download_link.click();
        download_link.parentNode.removeChild( download_link );
        
        if ( ! download_button ) {
            console.log( 'Done.' );
        }
    }, // end of download_zip()
    
    download_button = ( () => {
        const download_button = document.createElement( 'button' );
        
        download_button.id = SCRIPT_NAME + '-download-button';
        download_button.textContent = CONFIG.DOWNLOAD_BUTTON_TEXT;
        
        download_button.addEventListener( 'click', async ( event ) => {
            download_button.disabled = true;
            await download_zip( download_button );
            download_button.textContent = CONFIG.DOWNLOAD_BUTTON_TEXT;
            download_button.disabled = false;
        } );
        
        return download_button;
    } )(),
    
    insert_css = ( css_rule_text, css_style_id ) => {
        const
            parent = document.querySelector( 'head' ) || document.body || document.documentElement,
            css_style = document.createElement( 'style' ),
            css_rule = document.createTextNode( css_rule_text );
        
        css_style.type = 'text/css';
        css_style.className = SCRIPT_NAME + '-css-rule';
        
        if ( css_style_id ) {
            css_style.id = css_style_id;
        }
        
        if ( css_style.styleSheet ) {
            css_style.styleSheet.cssText = css_rule.nodeValue;
        }
        else {
            css_style.appendChild( css_rule );
        }
        
        parent.appendChild( css_style );
    },
    
    set_styles = () => {
        const
            download_button_selector = 'button#' + SCRIPT_NAME + '-download-button';
        
        insert_css( [
            download_button_selector + ' { cursor: pointer; font-size: 12px; }',
        ].join( '\n' ) );
    };

set_styles();
button_container.insertBefore( download_button, button_container.firstChild );

} )();
