export const teacherHtmlPromptFileName = "teacher-html-answer-prompt.txt";

export const teacherHtmlAnswerPrompt = `You are preparing worked answers for a tuition exam import.

I will provide the source question paper. Read the paper and solve every visible question.

Return ONLY the final answer HTML. Do not include Markdown fences, explanations outside the HTML, CSS, JavaScript, MathJax scripts, a head/body wrapper, or any links.

Required output structure:
- Create exactly one <section data-question-number="..."> for each printed question number.
- Use the printed question number exactly as shown on the paper.
- Keep subparts such as (a), (b), (i), and (ii) inside the same section when they belong to the same printed question number.
- Do not invent, rename, merge, or skip question numbers.
- Put the complete worked answer inside each section.

Worked-solution style:
- Match a clean full-solution worksheet style: plain black text, short explanatory lines, and step-by-step reasoning.
- Start each section with a heading containing the question number, for example <h2>1</h2> or <h2>2(a)</h2>.
- Put each explanation step in its own <p>.
- Put every equation, substitution, simplification, and final expression in its own display-math block.
- End each answer with <p>Final answer:</p> followed by a boxed display-math answer such as <div data-math-display="\\boxed{x = 4}"></div>.
- Keep the HTML readable with indentation and line breaks.
- Do not use CSS, classes, inline styles, or page-level layout. The import system supplies the rendering.

Allowed HTML inside each section:
- Text and headings: <p>, <br>, <h2>, <h3>, <h4>
- Emphasis: <strong>, <em>, <b>, <i>, <u>, <s>, <sup>, <sub>
- Lists: <ul>, <ol>, <li>
- Blocks and code: <blockquote>, <pre>, <code>
- Tables: <table>, <thead>, <tbody>, <tr>, <th>, <td>
- Images only when I provide local image files: <img src="assets/exact-file-name.png" alt="description">

Math rules:
- Inline math: <span data-math="x^2 + 1"></span>
- Display math: <div data-math-display="x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}"></div>
- Use LaTeX inside data-math and data-math-display.

Safety and import rules:
- Do not use <script>, <style>, <a>, <iframe>, <form>, embedded objects, event handler attributes, external image URLs, data URLs, or blob URLs.
- Do not use classes or inline styles.
- Do not include the question text unless it is needed to make the worked answer clear.

Example shape:
<section data-question-number="1">
  <h2>1</h2>
  <p>First, solve the equation.</p>
  <div data-math-display="2x + 3 = 11"></div>
  <p>Move 3 to the right side.</p>
  <div data-math-display="2x = 8"></div>
  <p>Divide both sides by 2.</p>
  <div data-math-display="x = 4"></div>
  <p>Final answer:</p>
  <div data-math-display="\\boxed{x = 4}"></div>
</section>

<section data-question-number="2">
  <h2>2</h2>
  <p>Worked answer for question 2 using the same step-by-step style.</p>
  <p>Final answer:</p>
  <div data-math-display="\\boxed{\\text{answer}}"></div>
</section>`;
