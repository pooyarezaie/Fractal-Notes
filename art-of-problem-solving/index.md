---
title: "هنر حل مسئله؛ راهبردها و عادت‌ها"
description: "مجموعه‌ای درباره‌ی هنر حل مسئله، با این باور که حل مسئله مهارتی یادگرفتنی است. هر برگه یک حرکت را روی چند مثال در عمل نشان می‌دهد."
date: 2026-09-04
last_modified_at: 2026-10-03
---

# هنر حل مسئله
**هر برگه، یک حرکت**

من بر این باورم که حل مسئله مهارتی یادگرفتنی است، نه استعدادی خدادادی. مثل هر مهارت دیگری می‌شود آن را آموزش داد و با تمرین بهتر کرد.

این مجموعه تلاشی برای همین کار است. هر برگه یک حرکت را برمی‌دارد، یعنی پرسشی یا عادتی که می‌شود هنگام روبه‌رو شدن با مسئله به کار برد. به‌جای تعریف کردنش، آن را روی چند مثال در عمل می‌بینیم: چه چیزی را آشکار می‌کند و کجا کم می‌آورد.

برگه‌های نخست درباره‌ی قدمی پیش از حل‌اند، یعنی فهمیدن خود مسئله. درخواستی به ما می‌رسد، چیزی خراب می‌شود، یا قانونی سر راهمان است که کسی دلیلش را نمی‌داند. پیش از دست‌به‌کار شدن چه بپرسیم؟

هر برگه را می‌شود جدا خواند، اما خواندن به ترتیب خالی از لطف نیست. برگه‌ها به هم اشاره می‌کنند، و دفترچه‌ای که در برگه‌ی یکم باز می‌شود در هر برگه چند خط تازه می‌گیرد. دانش خاصی لازم نیست. کافی است دفترچه‌ای کنار دستتان بگذارید و تمرین‌ها را واقعاً انجام دهید.

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
