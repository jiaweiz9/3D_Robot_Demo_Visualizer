function generateMockPointCloudSequence(numFrames, numPoints) {
    const sequence = [];
    for (let t = 0; t < numFrames; t++) {
        const frameData = new Float32Array(numPoints * 6); // x,y,z,r,g,b
        const phase = (t / numFrames) * Math.PI * 2;

        for (let i = 0; i < numPoints; i++) {
            const stride = i * 6;
            
            const u = Math.random();
            const v = Math.random();
            const theta = 2 * Math.PI * u;
            const phi = Math.acos(2 * v - 1);
            
            let r = 0.2 + 0.04 * Math.sin(phi * 5 + phase);

            frameData[stride] = r * Math.sin(phi) * Math.cos(theta); // x
            frameData[stride + 1] = r * Math.sin(phi) * Math.sin(theta); // y
            frameData[stride + 2] = r * Math.cos(phi); // z

            frameData[stride + 3] = 0.5 + 0.5 * Math.sin(phase); // r
            frameData[stride + 4] = Math.abs(frameData[stride + 1] / 3); // g
            frameData[stride + 5] = Math.abs(frameData[stride + 2] / 3); // b
        }
        sequence.push(frameData);
    }
    return sequence;
}

export { generateMockPointCloudSequence };