  // Attribute
  attribute vec2 layoutUv;

  attribute float lineIndex;

  attribute float lineLettersTotal;
  attribute float lineLetterIndex;

  attribute float lineWordsTotal;
  attribute float lineWordIndex;

  attribute float wordIndex;

  attribute float letterIndex;

  // Varyings
  varying vec2 vUv;
  varying vec2 vLayoutUv;
  varying vec3 vViewPosition;
  varying vec3 vNormal;

  varying float vLineIndex;

  varying float vLineLettersTotal;
  varying float vLineLetterIndex;

  varying float vLineWordsTotal;
  varying float vLineWordIndex;

  varying float vWordIndex;

  varying float vLetterIndex;


  mat4 rotationMatrix(vec3 axis, float angle) {
    axis = normalize(axis);
    float s = sin(angle);
    float c = cos(angle);
    float oc = 1.0 - c;
    
    return mat4(oc * axis.x * axis.x + c,           oc * axis.x * axis.y - axis.z * s,  oc * axis.z * axis.x + axis.y * s,  0.0,
                oc * axis.x * axis.y + axis.z * s,  oc * axis.y * axis.y + c,           oc * axis.y * axis.z - axis.x * s,  0.0,
                oc * axis.z * axis.x - axis.y * s,  oc * axis.y * axis.z + axis.x * s,  oc * axis.z * axis.z + c,           0.0,
                0.0,                                0.0,                                0.0,                                1.0);
}

vec3 rotate(vec3 v, vec3 axis, float angle) {
  mat4 m = rotationMatrix(axis, angle);
  return (m * vec4(v, 1.0)).xyz;
}

uniform float uSpeed;

  void main() {


      // Varyings
      vUv = uv;
      vLayoutUv = layoutUv;

      vNormal = normal;

      vLineIndex = lineIndex;

      vLineLettersTotal = lineLettersTotal;
      vLineLetterIndex = lineLetterIndex;

      vLineWordsTotal = lineWordsTotal;
      vLineWordIndex = lineWordIndex;

      vWordIndex = wordIndex;

      vLetterIndex = letterIndex;

      // Output
      vec3 newpos = position;

      // use rotate function
      float angleAmount = position.x*0.003;
      newpos = rotate(newpos, vec3(0., 0., 1.),  uSpeed* angleAmount * angleAmount);

      vec4 mvPosition = vec4(newpos, 1.0);
      mvPosition = modelViewMatrix * mvPosition;
      gl_Position = projectionMatrix * mvPosition;

      vViewPosition = -mvPosition.xyz;
  }