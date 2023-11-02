// Add this script to change background color dynamically
document.addEventListener("DOMContentLoaded", function () {
    setInterval(changeBackgroundColor, 5000); // Change color every 5 seconds (adjust as needed)
});

function changeBackgroundColor() {
    const body = document.body;
    const dynamicColors = ["#3498db", "#e74c3c", "#2ecc71", "#f39c12"]; // Add more colors as needed
    const randomColor = dynamicColors[Math.floor(Math.random() * dynamicColors.length)];
    body.style.backgroundColor = randomColor;
}
