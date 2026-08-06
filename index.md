---
title: "یادداشت‌های فرکتالی"
description: "برگه‌هایی کوتاه و شهودی دربارهٔ ایده‌های مهم ریاضی به زبان فارسی؛ از اعداد مختلط و استقرا تا اصل لانهٔ کبوتر، تقارن، مثلثات و حل خلاقانهٔ مسئله."
image: /assets/img/logo.png
---

{%- assign note_count = 0 -%}
{%- for group in site.data.site_index -%}
{%- assign note_count = note_count | plus: group.items.size -%}
{%- endfor -%}

<section class="home-hero">
<svg class="home-hero-mark" viewBox="0 0 100 86.6" aria-hidden="true" focusable="false">
<defs>
<g id="fs0"><path d="M50 0 0 86.6h100z"/></g>
<g id="fs1"><use href="#fs0" transform="translate(25 0) scale(.5)"/><use href="#fs0" transform="translate(0 43.3) scale(.5)"/><use href="#fs0" transform="translate(50 43.3) scale(.5)"/></g>
<g id="fs2"><use href="#fs1" transform="translate(25 0) scale(.5)"/><use href="#fs1" transform="translate(0 43.3) scale(.5)"/><use href="#fs1" transform="translate(50 43.3) scale(.5)"/></g>
<g id="fs3"><use href="#fs2" transform="translate(25 0) scale(.5)"/><use href="#fs2" transform="translate(0 43.3) scale(.5)"/><use href="#fs2" transform="translate(50 43.3) scale(.5)"/></g>
<g id="fs4"><use href="#fs3" transform="translate(25 0) scale(.5)"/><use href="#fs3" transform="translate(0 43.3) scale(.5)"/><use href="#fs3" transform="translate(50 43.3) scale(.5)"/></g>
</defs>
<use href="#fs4"/>
</svg>
<h1 class="home-title">یادداشت‌های فرکتالی</h1>
<p class="home-tagline">گام‌های کوچک در دل ساختارهای بزرگ ریاضی</p>
<div class="home-lede">
<p>به «یادداشت‌های فرکتالی» خوش آمدید؛ جایی برای نوشتن یادداشت‌هایی کوتاه، شهودی و گاهی عمیق دربارهٔ ریاضیات.</p>
<p>همان‌طور که یک فرکتال از تکرار طرحی ساده در اندازه‌های گوناگون ساخته می‌شود، هر برگهٔ این‌جا هم دریچه‌ای کوچک است رو به ساختاری بزرگ‌تر.</p>
<p>این‌ها جای کتاب را نمی‌گیرند؛ <strong>برگه‌هایی‌اند برای دیدن</strong> — هر کدام یک ایده، ساده و تا جای ممکن شهودی.</p>
<p>برخی برگه‌ها تک‌اند و هر جا که دوست داشتید می‌توانید بازشان کنید؛ اما بعضی‌ها <strong>شماره‌دار</strong>اند و پشت سر هم چیده شده‌اند تا از اول تا آخر خوانده شوند.</p>
</div>
<p class="home-stat"><span class="home-stat-n">{% include fa-number.html n=site.data.site_index.size %}</span> موضوع <span class="home-stat-dot" aria-hidden="true">·</span> <span class="home-stat-n">{% include fa-number.html n=note_count %}</span> برگه</p>
</section>

{%- for group in site.data.site_index -%}{%- if group.series -%}
<section class="home-series">
<p class="home-series-kicker">به ترتیب بخوانید <span class="home-stat-dot" aria-hidden="true">·</span> {% include fa-number.html n=group.items.size %} برگه</p>
<h2 class="home-series-title">{% if group.path %}<a href="{{ group.path | append: '/' | relative_url }}">{{ group.title }}</a>{% else %}{{ group.title }}{% endif %}</h2>
{%- if group.summary %}
<p class="home-series-summary">{{ group.summary }}</p>
{%- endif %}
<ol class="home-series-list">
{%- for item in group.items %}
<li><a href="{{ item.path | append: '/' | relative_url }}"><span class="home-num">{% include fa-number.html n=forloop.index %}</span><span class="home-series-name">{{ item.title }}</span></a></li>
{%- endfor %}
</ol>
<p class="home-series-actions">
<a class="home-cta" href="{{ group.items[0].path | append: '/' | relative_url }}">از برگهٔ یکم شروع کنید <span aria-hidden="true">←</span></a>
{%- if group.path %}
<a class="home-quiet-link" href="{{ group.path | append: '/' | relative_url }}">دربارهٔ این مجموعه</a>
{%- endif %}
</p>
</section>
{%- endif -%}{%- endfor -%}

<section class="home-topics">
<h2 class="home-section-title">موضوع‌های دیگر</h2>
<div class="home-grid">
{%- for group in site.data.site_index -%}{%- unless group.series -%}
<section class="home-card">
<h3 class="home-card-title">{% if group.path %}<a href="{{ group.path | append: '/' | relative_url }}">{{ group.title }}</a>{% else %}{{ group.title }}{% endif %}<span class="home-card-count">{% include fa-number.html n=group.items.size %} برگه</span></h3>
{%- if group.summary %}
<p class="home-card-summary">{{ group.summary }}</p>
{%- endif %}
<ul class="home-card-list">
{%- for item in group.items %}
<li><a href="{{ item.path | append: '/' | relative_url }}">{{ item.title }}</a></li>
{%- endfor %}
</ul>
</section>
{%- endunless -%}{%- endfor -%}
</div>
</section>
