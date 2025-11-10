// https://shaderpark.com/sculpture/-ObzyreIfEnUcARMrs55?hideeditor=true&hidepedestal=true
float distort(vec3 p, float a) {
	return min(0.00005, sin(p.x * a) + sin(p.y * a) + sin(p.z * a));
}

// Define the signed distance function (SDF) of your object here
float surfaceDistance(vec3 p) {
	return max( sphere(p, 0.5), distort(p + time * 0.1, 60.0) );
}

// Here you can define how your object at point p will be colored.
vec3 shade(vec3 p, vec3 normal) {
    vec3 lightDirection = vec3(0.0, 1.0, 0.0);
    float light = simpleLighting(p, normal, lightDirection)*1.2;
    vec3 color = vec3(1.5, 1.2, 0.5);
    color += normal * 0.2; // coloring
	color -= length(p); // internal glow
	return color*light;
}

