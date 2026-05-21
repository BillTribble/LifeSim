# Agent Instructions

- When starting local web servers, ALWAYS use a port other than 3000 (e.g., 3001, 8080, 8081). Port 3000 is reserved for another app.
- When handling slow motion controls (`timeScale`), NEVER include visual atmospheric parameters such as OrbitControls auto-rotation, automatic theme progress intervals, or bioluminescent pulsing effects. These must remain independent of simulation motion speeds.
- NEVER invoke browser testing tools or the browser subagent unless the user explicitly asks you to do so.