---
title: "یادداشت‌های فرکتالی"
description: "برگه‌هایی کوتاه و شهودی دربارهٔ ایده‌های مهم ریاضی به زبان فارسی؛ از اعداد مختلط و استقرا تا اصل لانهٔ کبوتر، تقارن، مثلثات و حل خلاقانهٔ مسئله."
image: /assets/img/logo.png
---

# یادداشت‌های فرکتالی  
**گام‌های کوچک در دل ساختارهای بزرگ ریاضی**

به «یادداشت‌های فرکتالی» خوش آمدید؛ جایی برای نوشتن یادداشت‌هایی کوتاه، شهودی و گاهی عمیق دربارهٔ ریاضیات.

همان‌گونه که یک فرکتال از تکرار طرح‌هایی ساده در اندازه‌های متفاوت پدید می‌آید، این یادداشت‌ها نیز هر یک دریچه‌ای کوچک‌اند رو به ساختارهایی ژرف‌تر.

هدف این مخزن، جمع‌آوری ایده‌ها، تعاریف، تمرین‌ها و اثبات‌های الهام‌بخش است؛ به شکلی ساده و در دسترس.

این یادداشت‌ها قرار نیست جایگزین کتاب باشند؛ بلکه **برگه‌های کوچک فهم**‌اند که هر کدام از زاویه‌ای کوچک شما را وارد موضوعی بزرگ می‌کنند.

برخی برگه‌ها تک‌اند و هر جا که دوست داشتید می‌توانید بازشان کنید؛ اما بعضی‌ها با نشانِ **دوره** پشت سر هم چیده شده‌اند و مثل یک درسِ کوتاه از اول تا آخر خوانده می‌شوند.

---

## برگه‌ها

<div class="topic-list">
{%- for group in site.data.site_index -%}
  <section class="topic{% if group.series %} topic-series{% endif %}">
    <h3 class="topic-title">
      {%- if group.path -%}
      <a href="{{ group.path | append: '/' | relative_url }}">{{ group.title }}</a>
      {%- else -%}
      {{ group.title }}
      {%- endif -%}
      {%- if group.series %}<span class="series-badge">دوره</span>{% endif -%}
    </h3>
    {%- if group.summary %}<p class="topic-summary">{{ group.summary }}</p>{% endif -%}
    <ul class="topic-notes">
      {%- for item in group.items -%}
      <li><a href="{{ item.path | relative_url }}">{% if group.series %}<span class="lesson-num">{% include fa-number.html n=forloop.index %}</span>{% endif %}{{ item.title }}</a></li>
      {%- endfor -%}
    </ul>
    {%- if group.series and group.path %}<a class="topic-start" href="{{ group.path | append: '/' | relative_url }}">دربارهٔ این دوره و فهرست کاملش <span aria-hidden="true">←</span></a>{% endif -%}
  </section>
{%- endfor -%}
</div>