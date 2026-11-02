// Personagem pintado do vôlei: o quadro da prancha + o rosto aceso, desenhado só dentro da tela escura (o visor) daquele quadro.
// No navegador o rosto é desenhado numa tela à parte, com brilho, e recortado pela máscara do visor (destination-in).
// Aqui o rosto vem de uma folha pronta (rostos_ia.png / rostos_bl.png, feita com o mesmo desenho do navegador)
// e a máscara recorta do mesmo jeito.
shader_type canvas_item;

uniform sampler2D mask_tex : filter_linear;   // máscara do visor (mesmo tamanho e lugar da prancha)
uniform sampler2D face_tex : filter_linear;   // folha de rostos: 6 expressões (colunas) × 10 larguras (linhas)
uniform vec2 atlas_size = vec2(1.0);          // tamanho da prancha em pixels
uniform float frame_x = 0.0;                  // onde o quadro começa na prancha
uniform vec2 face_c = vec2(0.0);              // centro do rosto (pixels do quadro)
uniform float face_r = 0.0;                   // giro do visor
uniform float face_k = 1.0;                   // pixels do quadro por unidade do rosto
uniform vec2 face_off = vec2(0.0);            // o rosto desce um pouquinho dentro do visor (e olha para a bola, se ligado)
uniform float face_ex = 0.0;                  // expressão: 0 normal · 1 piscando · 2 feliz · 3 susto · 4 triste · 5 concentrado
uniform float face_row = 3.0;                 // largura dos olhos (linha da folha)
uniform float has_face = 0.0;

const vec2 CELL = vec2(28.0, 20.0);
const vec2 GRID = vec2(6.0, 10.0);

void fragment() {
	vec4 c = COLOR;
	if (has_face > 0.5) {
		vec2 d = UV * atlas_size - vec2(frame_x, 0.0) - face_c;
		float cs = cos(face_r), sn = sin(face_r);
		vec2 q = vec2(cs * d.x + sn * d.y, -sn * d.x + cs * d.y) - face_off;
		vec2 u = q / face_k;
		if (abs(u.x) < CELL.x * 0.5 && abs(u.y) < CELL.y * 0.5) {
			vec2 fuv = vec2((face_ex * CELL.x + CELL.x * 0.5 + u.x) / (GRID.x * CELL.x), (face_row * CELL.y + CELL.y * 0.5 + u.y) / (GRID.y * CELL.y));
			vec4 f = texture(face_tex, fuv);
			f.a *= texture(mask_tex, UV).a;
			c.rgb = mix(c.rgb, f.rgb, f.a);
			c.a = c.a + f.a * (1.0 - c.a);
		}
	}
	COLOR = c;
}
