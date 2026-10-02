---
title: "هنر حل مسئله؛ راهبردها و عادت‌ها"
description: "مجموعه‌ای درباره‌ی هنر حل مسئله: در هر برگه یک حرکت — بازی با مسئله، نمونه‌ی کوچک، تغییر نگاه — روی یک مسئله‌ی واقعی تماشا می‌شود. برگه‌ها مستقل‌اند."
date: 2026-09-04
last_modified_at: 2026-09-04
---

# هنر حل مسئله
**وقتی هیچ راهی به ذهن نمی‌رسد، هنوز کارهایی از دستمان برمی‌آید**

حل مسئله را معمولاً این‌طور تصور می‌کنیم: یا راه به ذهن می‌رسد یا نمی‌رسد. اما میان این دو حالت، سرزمینی هست که می‌شود در آن کار کرد — حرکت‌هایی که مسئله‌ی ساکت را به حرف می‌آورند.

این مجموعه درباره‌ی همان حرکت‌هاست. در هر برگه یکی را انتخاب می‌کنیم و به‌جای تعریف کردنش، آن را در عمل تماشا می‌کنیم: مسئله‌ای که اولش راهی پیدا نیست، و قدم‌به‌قدم می‌بینیم آن حرکت چه چیزی را آشکار می‌کند — و کجا هم کم می‌آورد.

برگه‌های این مجموعه مستقل‌اند؛ از هر کدام می‌توانید شروع کنید. اما یک نخ همه را به هم می‌دوزد: دفترچه‌ای که در برگه‌ی یکم معرفی می‌شود و برگه‌های بعدی به آن برمی‌گردند.

---

## پیش‌نیاز

ریاضیِ مدرسه کافی است. آنچه بیشتر از دانش لازم دارید، حوصله‌ی دست‌به‌کار شدن است: این برگه‌ها را با کاغذ و مداد کنار دستتان بخوانید.

---

## فهرست برگه‌ها

{% assign course = site.data.site_index | where: "path", "art-of-problem-solving" | first %}

<ol class="course-toc">
{% for item in course.items %}<li class="course-toc-item">
<a class="course-toc-link" href="{{ item.path | append: '/' | relative_url }}">
<span class="course-toc-num">{% include fa-number.html n=forloop.index %}</span>
<span class="course-toc-body">
<span class="course-toc-title">{{ item.title }}</span>
{% if item.summary %}<span class="course-toc-summary">{{ item.summary }}</span>{% endif %}
</span>
</a>
</li>
{% endfor %}</ol>

<p class="course-start"><a href="{{ course.items[0].path | append: '/' | relative_url }}">از برگهٔ یکم شروع کنید <span aria-hidden="true">←</span></a></p>
