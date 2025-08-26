import json
import os
from datetime import datetime
import tkinter as tk
from tkinter import ttk, filedialog, messagebox, scrolledtext, simpledialog

class ToolTip:
    """Класс для создания подсказок к элементам интерфейса"""
    def __init__(self, widget, text):
        self.widget = widget
        self.text = text
        self.tip_window = None
        self.widget.bind("<Enter>", self.show_tip)
        self.widget.bind("<Leave>", self.hide_tip)

    def show_tip(self, event=None):
        """Показывает подсказку"""
        if self.tip_window or not self.text:
            return
        x, y, _, _ = self.widget.bbox("insert")
        x += self.widget.winfo_rootx() + 25
        y += self.widget.winfo_rooty() + 25
        
        self.tip_window = tw = tk.Toplevel(self.widget)
        tw.wm_overrideredirect(True)
        tw.wm_geometry(f"+{x}+{y}")
        
        label = tk.Label(tw, text=self.text, justify=tk.LEFT,
                        background="#ffffe0", relief=tk.SOLID, borderwidth=1,
                        font=("Arial", "10", "normal"))
        label.pack(ipadx=1)

    def hide_tip(self, event=None):
        """Скрывает подсказку"""
        if self.tip_window:
            self.tip_window.destroy()
            self.tip_window = None

class ArticleEditorApp:
    def __init__(self, root):
        self.root = root
        self.root.title("Редактор статей")
        self.root.geometry("1000x750")
        self.root.minsize(900, 600)
        
        # Инициализация стилей
        self.init_styles()
        
        # Основные переменные
        self.current_article = None
        self.json_file = 'articles.json'
        self.articles = []
        
        # Создание интерфейса
        self.create_main_frame()
        self.create_left_panel()
        self.create_right_panel()
        
        # Загрузка данных
        self.load_articles()
        self.update_articles_list()

    def init_styles(self):
        """Инициализация стилей элементов"""
        self.style = ttk.Style()
        self.style.configure('TFrame', background='#f0f0f0')
        self.style.configure('TLabel', background='#f0f0f0', font=('Arial', 10))
        self.style.configure('TButton', font=('Arial', 10))
        self.style.configure('Header.TLabel', font=('Arial', 12, 'bold'))
        self.style.configure('Listbox', font=('Arial', 10), background='white')
        self.style.map('TButton', background=[('active', '#e0e0e0')])

    def create_main_frame(self):
        """Создание основного фрейма"""
        self.main_frame = ttk.Frame(self.root)
        self.main_frame.pack(fill=tk.BOTH, expand=True, padx=10, pady=10)

    def create_left_panel(self):
        """Создание левой панели со списком статей"""
        self.left_panel = ttk.Frame(self.main_frame, width=300)
        self.left_panel.pack(side=tk.LEFT, fill=tk.Y, padx=(0, 10))
        
        # Заголовок
        ttk.Label(self.left_panel, text="Список статей", style='Header.TLabel').pack(pady=5)
        
        # Фрейм для списка с прокруткой
        list_frame = ttk.Frame(self.left_panel)
        list_frame.pack(fill=tk.BOTH, expand=True)
        
        # Полоса прокрутки
        scrollbar = ttk.Scrollbar(list_frame)
        scrollbar.pack(side=tk.RIGHT, fill=tk.Y)
        
        # Список статей
        self.articles_listbox = tk.Listbox(
            list_frame,
            yscrollcommand=scrollbar.set,
            font=('Arial', 10),
            selectbackground='#4a6984',
            selectforeground='white',
            activestyle='none',
            relief=tk.FLAT
        )
        self.articles_listbox.pack(fill=tk.BOTH, expand=True)
        self.articles_listbox.bind('<<ListboxSelect>>', self.on_article_select)
        
        scrollbar.config(command=self.articles_listbox.yview)
        
        # Кнопки управления
        btn_frame = ttk.Frame(self.left_panel)
        btn_frame.pack(fill=tk.X, pady=5)
        
        ttk.Button(
            btn_frame, 
            text="Новая статья", 
            command=self.new_article
        ).pack(side=tk.LEFT, expand=True, padx=2)
        
        ttk.Button(
            btn_frame, 
            text="Обновить", 
            command=self.refresh_list
        ).pack(side=tk.LEFT, expand=True, padx=2)

    def create_right_panel(self):
        """Создание правой панели с редактором"""
        self.right_panel = ttk.Frame(self.main_frame)
        self.right_panel.pack(side=tk.RIGHT, fill=tk.BOTH, expand=True)
        
        # Форма редактирования
        self.create_editor_form()
        
        # Редактор контента
        self.create_content_editor()
        
        # Панель инструментов
        self.create_toolbar()
        
        # Кнопки сохранения
        self.create_action_buttons()

    def create_editor_form(self):
        """Создание формы редактирования"""
        form_frame = ttk.Frame(self.right_panel)
        form_frame.pack(fill=tk.X, pady=5)
        
        # Поле заголовка
        ttk.Label(form_frame, text="Заголовок:").grid(row=0, column=0, sticky=tk.W, padx=5, pady=2)
        self.title_entry = ttk.Entry(form_frame, font=('Arial', 10))
        self.title_entry.grid(row=0, column=1, sticky=tk.EW, padx=5, pady=2)
        
        # Поле описания
        ttk.Label(form_frame, text="Описание:").grid(row=1, column=0, sticky=tk.W, padx=5, pady=2)
        self.desc_entry = ttk.Entry(form_frame, font=('Arial', 10))
        self.desc_entry.grid(row=1, column=1, sticky=tk.EW, padx=5, pady=2)
        
        # Поле изображения
        ttk.Label(form_frame, text="Изображение:").grid(row=2, column=0, sticky=tk.W, padx=5, pady=2)
        img_frame = ttk.Frame(form_frame)
        img_frame.grid(row=2, column=1, sticky=tk.EW, padx=5, pady=2)
        
        self.image_entry = ttk.Entry(img_frame, font=('Arial', 10))
        self.image_entry.pack(side=tk.LEFT, fill=tk.X, expand=True)
        
        browse_btn = ttk.Button(img_frame, text="...", width=3, command=self.browse_image)
        browse_btn.pack(side=tk.RIGHT)
        ToolTip(browse_btn, "Выбрать изображение")

    def create_content_editor(self):
        """Создание редактора контента"""
        ttk.Label(self.right_panel, text="Содержание:", style='Header.TLabel').pack(anchor=tk.W, pady=(10, 2))
        
        self.content_text = scrolledtext.ScrolledText(
            self.right_panel,
            wrap=tk.WORD,
            font=('Arial', 10),
            padx=5,
            pady=5,
            undo=True,
            maxundo=-1
        )
        self.content_text.pack(fill=tk.BOTH, expand=True)

    def create_toolbar(self):
        """Создание панели инструментов"""
        toolbar = ttk.Frame(self.right_panel)
        toolbar.pack(fill=tk.X, pady=5)
        
        # Кнопки форматирования
        buttons = [
            ("H1", "Заголовок 1 уровня", lambda: self.insert_tag("<h1>", "</h1>")),
            ("H2", "Заголовок 2 уровня", lambda: self.insert_tag("<h2>", "</h2>")),
            ("H3", "Заголовок 3 уровня", lambda: self.insert_tag("<h3>", "</h3>")),
            ("P", "Абзац", lambda: self.insert_tag("<p>", "</p>")),
            ("Изобр.", "Вставить изображение", self.insert_image),
            ("Список", "Маркированный список", self.insert_list),
            ("Ссылка", "Гиперссылка", self.insert_link)
        ]
        
        for text, tooltip, cmd in buttons:
            btn = ttk.Button(toolbar, text=text, command=cmd)
            btn.pack(side=tk.LEFT, padx=2)
            ToolTip(btn, tooltip)

    def create_action_buttons(self):
        """Создание кнопок действий"""
        btn_frame = ttk.Frame(self.right_panel)
        btn_frame.pack(fill=tk.X, pady=10)
        
        ttk.Button(
            btn_frame, 
            text="Очистить", 
            command=self.clear_form
        ).pack(side=tk.LEFT)
        
        ttk.Button(
            btn_frame, 
            text="Сохранить", 
            command=self.save_article
        ).pack(side=tk.RIGHT)

    def insert_tag(self, open_tag, close_tag):
        """Вставляет HTML-теги в текст"""
        self.content_text.insert(tk.INSERT, f"{open_tag}{close_tag}")
        self.content_text.mark_set(tk.INSERT, f"insert - {len(close_tag)} chars")
    
    def insert_image(self):
        """Вставляет изображение в контент"""
        path = filedialog.askopenfilename(
            title="Выберите изображение",
            filetypes=[("Изображения", "*.png *.jpg *.jpeg *.gif")]
        )
        if path:
            rel_path = os.path.relpath(path, os.path.dirname(os.path.abspath(self.json_file)))
            alt = simpledialog.askstring("Описание", "Введите описание изображения:")
            self.content_text.insert(tk.INSERT, f"<img src='{rel_path}' alt='{alt or ''}' style='max-width: 100%;'>\n")
    
    def insert_list(self):
        """Вставляет маркированный список"""
        items = simpledialog.askstring("Список", "Введите элементы через точку с запятой:")
        if items:
            html = "<ul>\n"
            for item in items.split(';'):
                if item.strip():
                    html += f"  <li>{item.strip()}</li>\n"
            html += "</ul>\n"
            self.content_text.insert(tk.INSERT, html)
    
    def insert_link(self):
        """Вставляет гиперссылку"""
        url = simpledialog.askstring("Ссылка", "Введите URL:")
        if url:
            text = simpledialog.askstring("Ссылка", "Введите текст ссылки:")
            self.content_text.insert(tk.INSERT, f"<a href='{url}'>{text or url}</a>")
    
    def browse_image(self):
        """Выбор изображения для превью"""
        path = filedialog.askopenfilename(
            title="Выберите изображение",
            filetypes=[("Изображения", "*.png *.jpg *.jpeg *.gif")]
        )
        if path:
            rel_path = os.path.relpath(path, os.path.dirname(os.path.abspath(self.json_file)))
            self.image_entry.delete(0, tk.END)
            self.image_entry.insert(0, rel_path)
    
    def load_articles(self):
        """Загружает статьи из JSON-файла"""
        try:
            if os.path.exists(self.json_file):
                with open(self.json_file, 'r', encoding='utf-8') as f:
                    self.articles = json.load(f)
            else:
                self.articles = []
        except Exception as e:
            messagebox.showerror("Ошибка", f"Не удалось загрузить статьи:\n{str(e)}")
            self.articles = []
    
    def update_articles_list(self):
        """Обновляет список статей"""
        self.articles_listbox.delete(0, tk.END)
        for article in sorted(self.articles, key=lambda x: x['id'], reverse=True):
            self.articles_listbox.insert(tk.END, f"{article['id']}. {article['title']}")
    
    def refresh_list(self):
        """Явное обновление списка статей"""
        self.load_articles()
        self.update_articles_list()
        messagebox.showinfo("Обновлено", "Список статей обновлен")
    
    def on_article_select(self, event):
        """Обработчик выбора статьи из списка"""
        selection = self.articles_listbox.curselection()
        if selection:
            article_id = int(self.articles_listbox.get(selection[0]).split('.')[0])
            self.current_article = next(a for a in self.articles if a['id'] == article_id)
            self.show_article(self.current_article)
    
    def show_article(self, article):
        """Отображает выбранную статью в редакторе"""
        self.title_entry.delete(0, tk.END)
        self.title_entry.insert(0, article['title'])
        
        self.desc_entry.delete(0, tk.END)
        self.desc_entry.insert(0, article['shortDescription'])
        
        self.image_entry.delete(0, tk.END)
        self.image_entry.insert(0, article['image'])
        
        self.content_text.delete(1.0, tk.END)
        self.content_text.insert(tk.END, article['fullContent'])
    
    def new_article(self):
        """Создание новой статьи"""
        self.current_article = None
        self.clear_form()
        self.title_entry.focus()
    
    def clear_form(self):
        """Очистка формы редактора"""
        self.title_entry.delete(0, tk.END)
        self.desc_entry.delete(0, tk.END)
        self.image_entry.delete(0, tk.END)
        self.content_text.delete(1.0, tk.END)
        self.current_article = None
    
    def save_article(self):
        """Сохранение статьи"""
        title = self.title_entry.get().strip()
        if not title:
            messagebox.showwarning("Ошибка", "Введите заголовок статьи")
            return
        
        # Подготовка данных статьи
        article_data = {
            "id": self.current_article['id'] if self.current_article else max((a['id'] for a in self.articles), default=0) + 1,
            "title": title,
            "date": datetime.now().strftime("%d.%m.%Y"),
            "shortDescription": self.desc_entry.get().strip(),
            "image": self.image_entry.get().strip(),
            "fullContent": self.content_text.get(1.0, tk.END).strip()
        }
        
        # Обновление или добавление статьи
        if self.current_article:
            index = next(i for i, a in enumerate(self.articles) if a['id'] == self.current_article['id'])
            self.articles[index] = article_data
        else:
            self.articles.append(article_data)
        
        # Сохранение и обновление
        self.save_to_json()
        self.update_articles_list()
        messagebox.showinfo("Сохранено", "Статья успешно сохранена")
    
    def delete_article(self):
        """Удаление статьи"""
        if not self.current_article:
            messagebox.showwarning("Ошибка", "Выберите статью для удаления")
            return
        
        if messagebox.askyesno("Подтверждение", "Удалить выбранную статью?"):
            self.articles = [a for a in self.articles if a['id'] != self.current_article['id']]
            self.save_to_json()
            self.update_articles_list()
            self.clear_form()
    
    def save_to_json(self):
        """Сохранение всех статей в JSON-файл"""
        try:
            with open(self.json_file, 'w', encoding='utf-8') as f:
                json.dump(self.articles, f, ensure_ascii=False, indent=2)
            return True
        except Exception as e:
            messagebox.showerror("Ошибка", f"Не удалось сохранить статьи:\n{str(e)}")
            return False

if __name__ == "__main__":
    root = tk.Tk()
    app = ArticleEditorApp(root)
    root.mainloop()
