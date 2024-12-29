class ContourGenerator {
    constructor(viewer) {
        this.viewer = viewer;
        this.entities = [];
    }

    // 生成示例数据
    generateSampleData(width, height, centerLon, centerLat, spacing) {
        const data = [];
        const sigma = spacing * 10; // 调整高斯函数的扩散范围

        for (let i = 0; i < height; i++) {
            const row = [];
            for (let j = 0; j < width; j++) {
                const lon = centerLon - (width/2 * spacing) + (j * spacing);
                const lat = centerLat - (height/2 * spacing) + (i * spacing);
                // 修改高斯函数计算方式
                const value = Math.exp(-(
                    Math.pow(lon - centerLon, 2) / (2 * sigma * sigma) +
                    Math.pow(lat - centerLat, 2) / (2 * sigma * sigma)
                ));
                row.push(value);
            }
            data.push(row);
        }
        return data;
    }

    // 创建等值线实体
    createContourEntity(contourPoints, height, color) {
        const positions = [];
        contourPoints.forEach(point => {
            positions.push(Cesium.Cartesian3.fromDegrees(point[0], point[1], height));
        });

        const entity = this.viewer.entities.add({
            polyline: {
                positions: positions,
                width: 3,
                material: new Cesium.ColorMaterialProperty(color.withAlpha(1.0)),
                clampToGround: false,
                zIndex: 1
            }
        });

        this.entities.push(entity);
        return entity;
    }

    // 添加贝塞尔曲线平滑方法
    smoothContourPoints(points, smoothness = 0.5) {
        if (points.length < 3) return points;

        const smoothPoints = [];
        const len = points.length;

        // 处理首尾相连的情况
        const isClosed = this.pointsEqual(points[0], points[len - 1]);
        
        for (let i = 0; i < len - (isClosed ? 0 : 1); i++) {
            const p0 = points[(i - 1 + len) % len];
            const p1 = points[i];
            const p2 = points[(i + 1) % len];
            const p3 = points[(i + 2) % len];

            // 为每段曲线生成多个点
            for (let t = 0; t < 1; t += 0.1) {
                const pt = this.getCatmullRomPoint(p0, p1, p2, p3, t, smoothness);
                smoothPoints.push(pt);
            }
        }

        return smoothPoints;
    }

    // Catmull-Rom 样条曲线插值
    getCatmullRomPoint(p0, p1, p2, p3, t, smoothness) {
        const t2 = t * t;
        const t3 = t2 * t;

        const v0 = (p2[0] - p0[0]) * smoothness;
        const v1 = (p3[0] - p1[0]) * smoothness;
        const v2 = (p2[1] - p0[1]) * smoothness;
        const v3 = (p3[1] - p1[1]) * smoothness;

        const x = (2 * p1[0] - 2 * p2[0] + v0 + v1) * t3 +
                 (-3 * p1[0] + 3 * p2[0] - 2 * v0 - v1) * t2 +
                 v0 * t + p1[0];
        
        const y = (2 * p1[1] - 2 * p2[1] + v2 + v3) * t3 +
                 (-3 * p1[1] + 3 * p2[1] - 2 * v2 - v3) * t2 +
                 v2 * t + p1[1];

        return [x, y];
    }

    pointsEqual(p1, p2) {
        return Math.abs(p1[0] - p2[0]) < 1e-10 && Math.abs(p1[1] - p2[1]) < 1e-10;
    }

    // 添加创建填充区域的方法
    createContourFill(contourPoints, height, color, nextColor) {
        const positions = contourPoints.map(point => 
            Cesium.Cartesian3.fromDegrees(point[0], point[1], height)
        );

        const entity = this.viewer.entities.add({
            polygon: {
                hierarchy: positions,
                material: new Cesium.ColorMaterialProperty(color.withAlpha(0.3)),
                height: height,
                extrudedHeight: height + 5,
                closeTop: true,
                closeBottom: true,
                zIndex: 0
            }
        });

        this.entities.push(entity);
        return entity;
    }

    // 修改创建标签的方法，添加多点标注
    createContourLabels(contourPoints, height, value, color) {
        if (!contourPoints || contourPoints.length < 3) return;

        // 计算等值线的总长度
        let totalLength = 0;
        for (let i = 0; i < contourPoints.length - 1; i++) {
            const p1 = contourPoints[i];
            const p2 = contourPoints[i + 1];
            totalLength += this.distance(p1, p2);
        }

        // 确定标签数量（根据等值线长度）
        const labelDistance = totalLength / 4; // 每隔1/4长度放置一个标签
        let currentLength = 0;

        // 沿等值线放置多个标签
        for (let i = 0; i < contourPoints.length - 1; i++) {
            const p1 = contourPoints[i];
            const p2 = contourPoints[i + 1];
            const segmentLength = this.distance(p1, p2);
            
            currentLength += segmentLength;
            
            // 当累积长度达到标签间距时放置标签
            if (currentLength >= labelDistance) {
                // 计算标签位置（线段上的插值点）
                const ratio = 1 - (currentLength - labelDistance) / segmentLength;
                const labelPos = [
                    p1[0] + (p2[0] - p1[0]) * ratio,
                    p1[1] + (p2[1] - p1[1]) * ratio
                ];

                // 创建标签实体
                const entity = this.viewer.entities.add({
                    position: new Cesium.CallbackProperty(() => {
                        return Cesium.Cartesian3.fromDegrees(
                            labelPos[0],
                            labelPos[1],
                            height + 100
                        );
                    }, false),
                    point: {
                        pixelSize: 0,
                        heightReference: Cesium.HeightReference.NONE
                    },
                    label: {
                        text: value.toFixed(2),
                        font: '16px sans-serif',
                        fillColor: Cesium.Color.WHITE,
                        outlineColor: color,
                        outlineWidth: 2,
                        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
                        verticalOrigin: Cesium.VerticalOrigin.CENTER,
                        horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
                        pixelOffset: new Cesium.Cartesian2(0, 0),
                        showBackground: true,
                        backgroundColor: Cesium.Color.BLACK.withAlpha(0.7),
                        backgroundPadding: new Cesium.Cartesian2(10, 7),
                        disableDepthTestDistance: Number.POSITIVE_INFINITY,
                        heightReference: Cesium.HeightReference.NONE,
                        scale: 1.0,
                        translucencyByDistance: new Cesium.NearFarScalar(1.5e2, 1.0, 8.0e6, 0.0)
                    }
                });

                this.entities.push(entity);
                currentLength = 0; // 重置累积长度
            }
        }
    }

    // 添加计算两点距离的辅助方法
    distance(p1, p2) {
        const dx = p1[0] - p2[0];
        const dy = p1[1] - p2[1];
        return Math.sqrt(dx * dx + dy * dy);
    }

    // 修改绘制等值线方法
    drawContours(options = {}) {
        const {
            width = 50,
            height = 50,
            centerLon = 116.391,
            centerLat = 39.901,
            spacing = 0.01,
            levels = [0.2, 0.4, 0.6, 0.8],
            contourHeight = 1000,
            smoothness = 0.5,
            showLabels = true  // 添加显示标签的选项
        } = options;

        try {
            const data = this.generateSampleData(width, height, centerLon, centerLat, spacing);
            
            if (!data || data.length === 0 || data[0].length === 0) {
                console.error('Invalid data generated');
                return;
            }

            // 计算数据范围
            let minVal = Infinity, maxVal = -Infinity;
            data.forEach(row => {
                row.forEach(val => {
                    minVal = Math.min(minVal, val);
                    maxVal = Math.max(maxVal, val);
                });
            });

            const normalizedLevels = levels.map(level => 
                minVal + level * (maxVal - minVal)
            ).sort((a, b) => b - a);

            // 创建更平滑的边界多边形
            const numPoints = 72; // 每90度24个点
            const boundaryPoints = [];
            const radius = Math.max(width, height) * spacing / 2;
            
            for (let i = 0; i <= numPoints; i++) {
                const angle = (i / numPoints) * Math.PI * 2;
                const lon = centerLon + radius * Math.cos(angle);
                const lat = centerLat + radius * Math.sin(angle);
                boundaryPoints.push([lon, lat]);
            }

            // 处理每个等值线级别
            normalizedLevels.forEach((level, index) => {
                try {
                    let contours = [];
                    
                    if (index === 0) {
                        // 对于最外层，使用圆形边界
                        contours = [boundaryPoints];
                    } else {
                        contours = MarchingSquares.isoLines(data, level);
                        
                        if (!contours || contours.length === 0) {
                            console.warn(`No contours generated for level ${level}`);
                            return;
                        }

                        contours = contours.map(contour => {
                            return contour.map(point => {
                                const lon = centerLon - (width/2 * spacing) + (point[1] * spacing);
                                const lat = centerLat - (height/2 * spacing) + (point[0] * spacing);
                                return [lon, lat];
                            });
                        }).filter(contour => contour && contour.length > 2);
                    }

                    // 处理每个轮廓
                    contours.forEach(contour => {
                        if (!contour || contour.length < 3) return;

                        try {
                            // 确保轮廓闭合
                            if (!this.pointsEqual(contour[0], contour[contour.length - 1])) {
                                contour.push([...contour[0]]);
                            }

                            // 对最外层应用更强的平滑
                            let smoothedPoints = this.smoothContourPoints(
                                contour, 
                                index === 0 ? smoothness * 1.5 : smoothness
                            );

                            const color = Cesium.Color.fromHsl((index * 0.25) % 1.0, 1.0, 0.5);
                            const nextColor = index < normalizedLevels.length - 1 
                                ? Cesium.Color.fromHsl(((index + 1) * 0.25) % 1.0, 1.0, 0.5)
                                : color;

                            this.createContourFill(smoothedPoints, contourHeight, color, nextColor);
                            this.createContourEntity(smoothedPoints, contourHeight + 10, color);

                            // 修改标签添加部分
                            if (showLabels) {
                                const actualValue = minVal + levels[levels.length - 1 - index] * (maxVal - minVal);
                                // 为每个轮廓添加多个标签
                                this.createContourLabels(smoothedPoints, contourHeight + 50, actualValue, color);
                            }
                        } catch (contourError) {
                            console.error('Error processing individual contour:', contourError);
                        }
                    });
                } catch (levelError) {
                    console.error(`Error processing level ${level}:`, levelError);
                }
            });
        } catch (error) {
            console.error('Error in drawContours:', error);
        }
    }

    // 清除所有等值线
    clearContours() {
        this.entities.forEach(entity => {
            this.viewer.entities.remove(entity);
        });
        this.entities = [];
    }

    // 使用真实数据生成等值线
    drawContoursFromData(data, options = {}) {
        const {
            bounds = {
                west: 116.0,
                south: 39.5,
                east: 117.0,
                north: 40.5
            },
            levels = [0.2, 0.4, 0.6, 0.8],
            contourHeight = 1000
        } = options;

        const width = data[0].length;
        const height = data.length;
        const lonSpacing = (bounds.east - bounds.west) / (width - 1);
        const latSpacing = (bounds.north - bounds.south) / (height - 1);

        levels.forEach((level, index) => {
            try {
                const contours = window.marchingsquares.isoBands(
                    data,
                    level - 0.0001,
                    level + 0.0001
                );

                contours.forEach(contour => {
                    const contourPoints = contour.map(point => {
                        const lon = bounds.west + point[0] * lonSpacing;
                        const lat = bounds.south + point[1] * latSpacing;
                        return [lon, lat];
                    });

                    const color = Cesium.Color.fromHsl((index * 0.25) % 1.0, 1.0, 0.5);
                    this.createContourEntity(contourPoints, contourHeight, color);
                });
            } catch (error) {
                console.error('Error generating contour for level ' + level, error);
            }
        });
    }
}

// 添加自定义渐变材质
Cesium.Material.GradientType = 'Gradient';
Cesium.Material._materialCache.addMaterial(Cesium.Material.GradientType, {
    fabric: {
        type: Cesium.Material.GradientType,
        uniforms: {
            color: new Cesium.Color(1.0, 0.0, 0.0, 1.0),
            nextColor: new Cesium.Color(0.0, 1.0, 0.0, 1.0),
            repeat: 1
        },
        source: `
            czm_material czm_getMaterial(czm_materialInput materialInput) {
                czm_material material = czm_getDefaultMaterial(materialInput);
                vec2 st = materialInput.st;
                material.diffuse = mix(color.rgb, nextColor.rgb, st.t);
                material.alpha = mix(color.a, nextColor.a, st.t);
                return material;
            }
        `
    }
}); 