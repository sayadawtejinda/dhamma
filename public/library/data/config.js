// Where the sermon MP3 files are hosted (folder URLs ending with "/"; files are named like 00001ANP01.mp3).
// audioBase1 = tracks 1-1303 (Paauk_MP3_1), audioBase2 = tracks 1304 and up (Paauk_MP3_2).
// 12 GB of audio is too big for GitHub Pages, so it lives on archive.org (see scripts/library/upload_to_archive.ps1).
// While the upload is not finished, set both to 'audio/' to test locally (a folder next to this page, never committed).
window.LIB_CONFIG = {
  audioBase1: 'https://archive.org/download/paauk-dhamma-mp3-1/',
  audioBase2: 'https://archive.org/download/paauk-dhamma-mp3-2/'
};
