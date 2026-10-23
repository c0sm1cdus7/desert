<script lang="ts">let {color}:{color:string}=$props();</script>
<span class="color-bullet" data-color={color} aria-hidden="true"></span>
<style>
  .color-bullet {display:inline-block;flex:none;width:.55em;height:.55em;border-radius:50%;background:var(--muted-foreground);}
  [data-color="blue"]{background:#639ce9;} [data-color="violet"]{background:#ac89db;}
  [data-color="rose"]{background:#d786a7;} [data-color="green"]{background:#66aa97;}
  [data-color="amber"]{background:#dfad55;} [data-color="slate"]{background:#93a3b7;}
</style>
