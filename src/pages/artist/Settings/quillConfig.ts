// src/pages/artist/Settings/quillConfig.ts
// 富文本編輯器（ReactQuill）共用設定，避免每個用到編輯器的分頁各自重複定義一份。

// 比 Quill 內建色票豐富的自訂色盤（沿用類似 Google Docs 的排列方式）
export const QUILL_COLOR_PALETTE = [
  '#000000', '#424242', '#636363', '#9C9C94', '#CEC6CE', '#EFEFEF', '#F7F7F7', '#FFFFFF',
  '#FF0000', '#FF9900', '#FFFF00', '#00FF00', '#00FFFF', '#0000FF', '#9900FF', '#FF00FF',
  '#F4CCCC', '#FCE5CD', '#FFF2CC', '#D9EAD3', '#D0E0E3', '#CFE2F3', '#D9D2E9', '#EAD1DC',
  '#EA9999', '#F9CB9C', '#FFE599', '#B6D7A8', '#A2C4C9', '#9FC5E8', '#B4A7D6', '#D5A6BD',
  '#E06666', '#F6B26B', '#FFD966', '#93C47D', '#76A5AF', '#6FA8DC', '#8E7CC3', '#C27BA0',
  '#CC0000', '#E69138', '#F1C232', '#6AA84F', '#45818E', '#3D85C6', '#674EA7', '#A64D79',
  '#990000', '#B45F06', '#BF9000', '#38761D', '#134F5C', '#0B5394', '#351C75', '#741B47',
  '#660000', '#783F04', '#7F6000', '#274E13', '#0C343D', '#073763', '#20124D', '#4C1130',
];

export const QUILL_MODULES = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    [{ size: ['small', false, 'large', 'huge'] }],
    ['bold', 'italic', 'underline', 'strike', 'blockquote'],
    [{ color: QUILL_COLOR_PALETTE }, { background: QUILL_COLOR_PALETTE }],
    [{ list: 'ordered' }, { list: 'bullet' }, { align: [] }],
    ['link', 'clean'],
  ],
};
