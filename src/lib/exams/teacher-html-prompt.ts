export const teacherHtmlPromptFileName = "teacher-html-answer-prompt.txt";

export const teacherHtmlAnswerPrompt = `You are preparing worked answers for a tuition exam import.

I will provide the source question paper. Read the paper and solve every visible question.

Return ONLY the final answer HTML. Do not include Markdown fences, explanations outside the HTML, CSS, JavaScript, a head/body wrapper, or any links.

Required output structure:
- Create exactly one <section data-question-number="..."> for each printed question number.
- Use the printed question number exactly as shown on the paper.
- Keep subparts such as (a), (b), (i), and (ii) inside the same section when they belong to the same printed question number.
- Do not invent, rename, merge, or skip question numbers.
- Put the complete worked answer inside each section.

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
  <p>First solve the equation.</p>
  <div data-math-display="2x + 3 = 11"></div>
  <p>So <span data-math="x = 4"></span>.</p>
</section>

<section data-question-number="2">
  <p>Worked answer for question 2.</p>
</section>`;
