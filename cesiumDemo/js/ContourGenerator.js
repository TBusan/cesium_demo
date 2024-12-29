class ContourGenerator {
    constructor(viewer) {
        this.viewer = viewer;
        this.entities = [];
    }

    // 生成示例数据
    generateSampleData(width, height, centerLon, centerLat, spacing) {
        const data = [];
        for (let i = 0; i < height; i++) {
            const row = [];
            for (let j = 0; j < width; j++) {
                const lon = centerLon - (width/2 * spacing) + (j * spacing);
                const lat = centerLat - (height/2 * spacing) + (i * spacing);
                // 使用高斯函数生成示例数据
                const value = Math.exp(-((lon - centerLon)**2 + (lat - centerLat)**2) / (2 * spacing));
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
                width: 2,
                material: color,
                clampToGround: true
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
                material: new Cesium.ColorMaterialProperty(color.withAlpha(0.7)),
                height: height,
                extrudedHeight: height + 10,
                closeTop: true,
                closeBottom: true
            }
        });

        this.entities.push(entity);
        return entity;
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
            smoothness = 0.5
        } = options;

        const data = this.generateSampleData(width, height, centerLon, centerLat, spacing);
        const sortedLevels = [...levels].sort((a, b) => b - a); // 从高到低排序

        // 创建一个包围整个区域的边界多边形
        const boundaryPoints = [
            [centerLon - (width/2 * spacing), centerLat - (height/2 * spacing)],
            [centerLon + (width/2 * spacing), centerLat - (height/2 * spacing)],
            [centerLon + (width/2 * spacing), centerLat + (height/2 * spacing)],
            [centerLon - (width/2 * spacing), centerLat + (height/2 * spacing)],
            [centerLon - (width/2 * spacing), centerLat - (height/2 * spacing)]
        ];

        // 为每个等值线级别生成轮廓和填充
        sortedLevels.forEach((level, index) => {
            try {
                let contours = [];
                
                // 对于最高级别，使用边界多边形
                if (index === 0) {
                    contours = [[boundaryPoints]];
                } else {
                    // 使用 MarchingSquares 生成等值线
                    contours = MarchingSquares.isoLines(data, level).map(contour => {
                        // 转换等值线坐标
                        return contour.map(point => {
                            const lon = centerLon - (width/2 * spacing) + (point[1] * spacing);
                            const lat = centerLat - (height/2 * spacing) + (point[0] * spacing);
                            return [lon, lat];
                        });
                    });
                }

                // 处理每个轮廓
                contours.forEach(contour => {
                    // 确保轮廓是闭合的
                    if (!this.pointsEqual(contour[0], contour[contour.length - 1])) {
                        contour.push([...contour[0]]);
                    }

                    // 应用平滑处理
                    let smoothedPoints = this.smoothContourPoints(contour, smoothness);

                    // 创建颜色
                    const color = Cesium.Color.fromHsl((index * 0.25) % 1.0, 1.0, 0.5);
                    const nextColor = index < sortedLevels.length - 1 
                        ? Cesium.Color.fromHsl(((index + 1) * 0.25) % 1.0, 1.0, 0.5)
                        : color;

                    // 创建填充区域
                    this.createContourFill(smoothedPoints, contourHeight, color, nextColor);

                    // 创建等值线
                    this.createContourEntity(smoothedPoints, contourHeight + 20, color);
                });
            } catch (error) {
                console.error('Error generating contour for level ' + level, error);
            }
        });
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