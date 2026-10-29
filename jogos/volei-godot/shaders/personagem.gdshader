// Quadro do moveset + rosto aceso desenhado só dentro do visor (máscara do quadro), girado e achatado como o visor
shader_type canvas_item;
uniform sampler2D mask_tex : filter_linear;
uniform sampler2D face_tex : filter_linear;
uniform vec2 atlas_size = vec2(1.0);
uniform vec2 frame_xy = vec2(0.0);
uniform vec2 fc = vec2(0.0);      // centro do rosto (px do quadro)
uniform float fr = 0.0;           // inclinação do visor
uniform vec2 fs = vec2(1.0);      // px por unidade do rosto (x já achatado, y)
uniform float fdy = 0.0;          // desce o rosto um pouco dentro do visor
uniform float ex = 0.0;           // expressão (0 a 5)
uniform float has_face = 0.0;
void fragment() {
	vec4 c = texture(TEXTURE, UV);
	if (has_face > 0.5) {
		vec2 d = UV * atlas_size - frame_xy - fc;
		float cs = cos(-fr), sn = sin(-fr);
		vec2 q = vec2(cs * d.x - sn * d.y, sn * d.x + cs * d.y);
		q.y -= fdy;
		vec2 u = q / fs;
		if (abs(u.x) < 10.0 && abs(u.y) < 8.0) {
			vec4 f = texture(face_tex, vec2((ex * 20.0 + 10.0 + u.x) / 120.0, (8.0 + u.y) / 16.0));
			f.a *= texture(mask_tex, UV).a;
			c.rgb = mix(c.rgb, f.rgb, f.a);
			c.a = max(c.a, f.a);
		}
	}
	COLOR = c; // no Godot 4, COLOR já vem multiplicado pela textura: aqui a cor final é a do quadro + rosto
}
