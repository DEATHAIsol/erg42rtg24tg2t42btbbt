/**
 * Applies the saved theme before first paint so a light-mode user never sees a
 * dark flash. Runs inline in <head>, ahead of React hydration.
 */
export function ThemeScript() {
  const js = `(function(){try{
    var t='dark';
    var s=localStorage.getItem('terminal-settings');
    if(s){var p=JSON.parse(s); if(p&&p.theme){t=p.theme;}}
    document.documentElement.setAttribute('data-theme',t);
  }catch(e){document.documentElement.setAttribute('data-theme','dark');}})();`
  return <script dangerouslySetInnerHTML={{ __html: js }} />
}
