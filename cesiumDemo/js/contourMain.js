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

// 定义等值线区域的中心和范围
const centerLon = 116.391;
const centerLat = 39.901;
const spacing = 0.01;
const width = 50;
const height = 50;

// 计算等值线区域的边界
const bounds = {
    west: centerLon - (width/2 * spacing),
    east: centerLon + (width/2 * spacing),
    south: centerLat - (height/2 * spacing),
    north: centerLat + (height/2 * spacing)
};

// 绘制示例等值线
contourGenerator.drawContours({
    width: width,
    height: height,
    centerLon: centerLon,
    centerLat: centerLat,
    spacing: spacing,
    levels: [0.2, 0.4, 0.6, 0.8],
    contourHeight: 1000
});

// 设置视图以显示整个等值线区域
viewer.camera.flyTo({
    destination: Cesium.Rectangle.fromDegrees(bounds.west, bounds.south, bounds.east, bounds.north),
    duration: 1,
    complete: function() {
        // 调整到合适的观察高度
        viewer.camera.zoomOut(20000.0);
    }
});

// 添加边界框以便观察
viewer.entities.add({
    rectangle: {
        coordinates: Cesium.Rectangle.fromDegrees(bounds.west, bounds.south, bounds.east, bounds.north),
        material: Cesium.Color.WHITE.withAlpha(0.1),
        outline: true,
        outlineColor: Cesium.Color.RED
    }
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