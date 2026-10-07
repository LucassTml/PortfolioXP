# PortfolioXP

**Meu portfólio pessoal em forma de sistema operacional retrô, inspirado no Windows XP. Bem-vindo ao _LucasOS_.**

[![Acessar o portfólio](https://img.shields.io/badge/Acessar%20o%20portf%C3%B3lio-lucasstml.github.io%2FPortfolioXP-245EDC?style=for-the-badge)](https://lucasstml.github.io/PortfolioXP/)

![HTML5](https://img.shields.io/badge/HTML5-E34F26?logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-puro-F7DF1E?logo=javascript&logoColor=black)
![GitHub Pages](https://img.shields.io/badge/GitHub%20Pages-deploy%20autom%C3%A1tico-222222?logo=githubpages&logoColor=white)
![Zero dependências](https://img.shields.io/badge/depend%C3%AAncias-0-2E8B1D)

---

## Sobre

Em vez de uma página de currículo comum, este portfólio é uma **área de trabalho interativa**. Você liga o "computador", vê a tela de boot e encontra ícones, janelas, barra de tarefas e menu Iniciar, tudo com a estética clássica do Windows XP.

Cada seção do portfólio (Sobre Mim, Habilidades, Formação, Projetos e Contato) abre como uma janela. Junto com elas há **mini-jogos**, um **terminal** e **visualizadores de algoritmos** para mostrar na prática um pouco do que eu gosto de construir.

Tudo foi feito com **HTML, CSS e JavaScript puros**, num único arquivo e sem nenhuma biblioteca ou framework.

## O que tem na área de trabalho

| Ícone | Aplicativo | O que faz |
|:---:|---|---|
| 🧑‍💻 | **Sobre Mim** | Quem eu sou, o que estudo e os idiomas que falo |
| 🛠️ | **Habilidades** | Tecnologias que uso e habilidades interpessoais |
| 🎓 | **Formação** | Engenharia da Computação na UPE e demais formações |
| 📁 | **Meus Projetos** | Links para os meus principais repositórios |
| ✉️ | **Contato** | E-mail, LinkedIn e GitHub |
| 🐙 / in | **GitHub** e **LinkedIn** | Atalhos diretos para os meus perfis |
| 👾 | **Space Invaders** | Clássico de nave com fases e power-ups |
| ⬡ | **Hexágono** | Jogo de reflexo inspirado em *Super Hexagon* |
| `>_` | **Terminal** | Prompt de comando com comandos de verdade (ou quase) |
| 📊 | **Ordenação** | Visualizador animado de algoritmos de ordenação |
| 🧩 | **Labirinto** | Gerador de labirintos e visualizador de busca de caminhos |

## Funcionalidades

### 🪟 Experiência de sistema operacional
- **Tela de boot** do *LucasOS*, que abre algumas janelas automaticamente ao iniciar.
- **Janelas** que podem ser arrastadas, redimensionadas, minimizadas, maximizadas e fechadas.
- **Barra de tarefas** com as janelas abertas e um relógio.
- **Menu Iniciar** com todos os aplicativos e a opção *Encerrar sessão*.
- **Menu de contexto:** clique com o botão direito na área de trabalho para trocar o papel de parede por uma imagem do seu computador.
- **Tema XP ↔ Vista/Aero**, alternado por um botão no canto da tela.
- **Efeitos sonoros** sintetizados em tempo real com a Web Audio API (sem nenhum arquivo de áudio), com botão para silenciar.
- **Layout responsivo** para telas pequenas e respeito à preferência de *movimento reduzido* (`prefers-reduced-motion`).

### 🎮 Mini-jogos
- **Space Invaders:** três fases com dificuldade crescente. Ao concluir uma fase, você escolhe 1 entre 3 power-ups sorteados (*+1 Vida*, *Tiro Duplo*, *Tiro Rápido*, *Nave Ágil* ou *Escudo*).
  Controles: `←` `→` ou `A` `D` para mover e `Espaço` para atirar ou reiniciar.
- **Hexágono:** desvie das paredes que se fecham em direção ao centro, com velocidade que aumenta a cada segundo.
  Controles: `←` `→` ou `A` `D` para girar e `Espaço` para reiniciar.

### 📊 Visualizadores de algoritmos
- **Ordenação:** veja passo a passo **Bubble Sort**, **Selection Sort**, **Insertion Sort**, **Quick Sort** e **Merge Sort** organizando 64 barras. Vermelho indica comparação e verde indica posição final.
- **Labirinto:** gera labirintos aleatórios com *backtracking* recursivo e resolve com **BFS**, **DFS**, **Dijkstra** ou **A\***. Roxo indica células visitadas e amarelo indica o caminho final.

### `>_` Terminal
Um prompt no estilo `C:\Users\Lucas>` que entende alguns comandos:

| Comando | Resultado |
|---|---|
| `help` / `ajuda` | Lista os comandos disponíveis |
| `whoami` | Mostra o usuário atual |
| `sobre` | Resumo rápido sobre mim |
| `ls` / `dir` | Lista as "pastas" do sistema |
| `neofetch` | Ficha técnica do *LucasOS* |
| `date` | Data e hora atuais |
| `cls` / `clear` | Limpa a tela |

> 👀 Dizem que existe um comando secreto escondido por aí...

## Como executar localmente

Não há build nem dependências para instalar. Basta clonar o repositório e abrir o `index.html`:

```bash
git clone https://github.com/LucassTml/PortfolioXP.git
cd PortfolioXP
```

Depois abra o `index.html` no navegador. Se preferir, sirva a pasta com um servidor local:

```bash
python -m http.server 8000
# acesse http://localhost:8000
```

## Personalização

No início do `<script>` do `index.html` há um bloco **CONFIGURAÇÃO** com os valores mais fáceis de ajustar:

| Constante | Para que serve |
|---|---|
| `WALLPAPER_IMAGE` | Caminho ou URL de um papel de parede personalizado (`null` mantém o padrão) |
| `GITHUB_URL` / `LINKEDIN_URL` | Links usados nos atalhos e na janela de Contato |
| `GAME_CONFIG.invaders` | Velocidades, vidas, fases e lista de power-ups do Space Invaders |
| `GAME_CONFIG.hexagon` | Velocidade de rotação, velocidade inicial, aceleração e tamanho do vão |
| `GAME_CONFIG.sort` | Quantidade de barras e velocidade da animação de ordenação |
| `GAME_CONFIG.maze` | Tamanho do labirinto (valores ímpares) e velocidade da busca |

## Deploy

O site é publicado automaticamente no **GitHub Pages** pelo workflow [`.github/workflows/static.yml`](.github/workflows/static.yml). A cada `push` na branch `main`, a versão mais recente vai ao ar em **[lucasstml.github.io/PortfolioXP](https://lucasstml.github.io/PortfolioXP/)**.

## Estrutura do projeto

```
PortfolioXP/
├── index.html                  # O portfólio completo: estrutura, estilos e scripts
├── OldVersions/                # Versões anteriores, guardadas como histórico da evolução
└── .github/workflows/
    └── static.yml              # Deploy automático no GitHub Pages
```

## Tecnologias

- **HTML5 e CSS3:** layout, tema Luna (XP) e tema Vista/Aero
- **JavaScript puro:** gerenciador de janelas, terminal, jogos e algoritmos
- **Canvas API:** renderização dos mini-jogos
- **Web Audio API:** efeitos sonoros gerados por código
- **GitHub Actions e GitHub Pages:** CI/CD e hospedagem

## Contato

**Lucas Melo**, estudante de Engenharia da Computação na Universidade de Pernambuco (UPE).

[![LinkedIn](https://img.shields.io/badge/LinkedIn-Lucas%20Melo-0A66C2?logo=linkedin&logoColor=white)](https://www.linkedin.com/in/lucas-eduardo-melo-tenorio-05326a311/)
[![GitHub](https://img.shields.io/badge/GitHub-LucassTml-181717?logo=github&logoColor=white)](https://github.com/LucassTml)

---

<sub>Projeto pessoal sem fins comerciais. Windows XP e Windows Vista são marcas registradas da Microsoft Corporation, e este projeto não tem qualquer afiliação com a empresa.</sub>
