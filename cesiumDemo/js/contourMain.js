Cesium.Ion.defaultAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI0NTEyMTQ4ZS00NTdmLTRhYTYtYTY5NS1mYWIwNDY2OGNhNDYiLCJpZCI6MTMxODY0LCJpYXQiOjE2ODA1MDY0Nzd9.9TwdaxPqnGYRop2hp8lAKNgLlty3YFd_tAcijUPmB4A';
// 初始化 viewer
const viewer = new Cesium.Viewer('cesiumContainer', {
    baseLayerPicker: false,
    timeline: false,
    animation: false,
    navigationHelpButton: false,
    fullscreenButton: false,
    geocoder: false,
    homeButton: false,
    sceneModePicker: false,
    scene3DOnly: true
});

// 移除版权信息
viewer._cesiumWidget._creditContainer.style.display = "none";

// 创建等值线生成器
const contourGenerator = new ContourGenerator(viewer);

// 绘制示例等值线
contourGenerator.drawContours({
    width: 50,
    height: 50,
    centerLon: 116.391,
    centerLat: 39.901,
    spacing: 0.01,
    levels: [0.2, 0.4, 0.6, 0.8],
    contourHeight: 1000
});

// 设置视图
viewer.camera.setView({
    destination: Cesium.Cartesian3.fromDegrees(116.391, 39.901, 100.0)
});

// 示例：使用真实数据
// const realData = [
//     [/* 你的数据 */],
//     [/* 你的数据 */]
// ];
// contourGenerator.drawContoursFromData(realData, {
//     bounds: {
//         west: 116.0,
//         south: 39.5,
//         east: 117.0,
//         north: 40.5
//     },
//     levels: [0.2, 0.4, 0.6, 0.8],
//     contourHeight: 1000
// }); 