// regexes.js

window.GoogleAPIMailClient = window.GoogleAPIMailClient || { };

GoogleAPIMailClient.oRegexes = {
  'a':[
    {
      'name':['aliexpress','aliexpress.com'],
      'structure':['id','title','url','name','date','time'],
      'pattern':[
        'order_id=(\\d+).*?<strong>(.*)<\/strong><\/a>.*?<a.*?href="(.*?)">(.*)<\/a>.*?([0-9]+.[0-9]+.[0-9]+)\\s([0-9]+:[0-9]+)',
        'order_id=(\\d+).*?<\/a><span.*?><strong>(.*?)<\/strong>.*?<a.*?href="(.*?)">(.*)<\/a>.*?([0-9]+.[0-9]+.[0-9]+)\\s([0-9]+:[0-9]+)'
      ]
    }
  ],
  'e':[
    {
      'name':['exist','exist.ua'],
      'structure':['title','id','date','time','url','name'],
      'pattern':[
        '<font color="white" size="2">(.*?)№.*?(\\w+-.*?)<\/font>.*?Дата:.*?(\\d+.\\d+.\\d+)\\s?(\\d+:\\d+).*?http:\/\/www.(exist.ua).*?2006.*?[0-9]+(.*)?<\/font>'
      ]
    }
  ],
  'r':[
    {
      'name':['rozetka','rozetka.ua'],
      'structure':['id','title','url','name','date','time'],
      'pattern':[
        'order_id=(\\d+).*?<strong>(.*)<\/strong><\/a>.*?<a.*?href="(.*?)">(.*)<\/a>.*?([0-9]+.[0-9]+.[0-9]+)\\s([0-9]+:[0-9]+)',
        'order_id=(\\d+).*?<\/a><span.*?><strong>(.*?)<\/strong>.*?<a.*?href="(.*?)">(.*)<\/a>.*?([0-9]+.[0-9]+.[0-9]+)\\s([0-9]+:[0-9]+)',
        'td colspan="3".*\\n\\t\\s*?<a.*\\n\\t\\s*?<span.*\\n(.*)\\n\\s*?.*\\s*?.*\\s*?.*\\s*?.*\\s*?<tr>\\s*<td.*\\s*?<span.*\\s*?(\\d+)<span.*>(.*?)<\/span>'
      ]
    }
  ],
  'o':[
    {
      'name':['ozon','ozon.ru'],
      'structure':['date','title','id','url','name'],
      'pattern':[
        '<br class="">Дата: .*?, (\\d+\\s.*\\s\\d+ г.)<br class="">(Тема: Ваш заказ N ([- \\s\\d+]*).*?)<a href="http:\/\/(ozon.ru)" class="">(OZON.ru)<\/a>'
      ]
    }
  ]
};