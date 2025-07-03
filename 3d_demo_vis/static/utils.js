async function saveCurrentGizmoPose(paramPose, currentFrame) {
    try {
        const poseArray = [paramPose.x, paramPose.y, paramPose.z, paramPose.qw, paramPose.qx, paramPose.qy, paramPose.qz];
        
        const response = await fetch('/save_gizmo_pose', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                pose: poseArray,
                frame: currentFrame,
                timestamp: Date.now()
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error: ${response.status}`);
        }

        const data = await response.json();
        return data.success;
    } catch (error) {
        console.error('Failed to save pose:', error);
        return false;
    }
}

export { saveCurrentGizmoPose };