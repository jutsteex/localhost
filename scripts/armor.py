import json
import tkinter as tk
from tkinter import ttk, filedialog, messagebox
import os

class ArmorEditor:
    def __init__(self, root):
        self.root = root
        self.root.title("Редактор брони JSON")
        self.root.geometry("1200x950")  # Увеличенный размер окна
        
        # Инициализация данных
        self.data = {"armor": []}
        self.current_index = -1
        self.filename = ""
        
        # Создание элементов интерфейса
        self.create_widgets()
        
    def create_widgets(self):
        # Фрейм для списка и кнопок
        left_frame = ttk.Frame(self.root, padding="10")
        left_frame.pack(side=tk.LEFT, fill=tk.Y)
        
        # Список брони
        self.armor_list = tk.Listbox(left_frame, width=35, height=45)  # Увеличенная высота
        self.armor_list.pack(fill=tk.BOTH, expand=True)
        self.armor_list.bind('<<ListboxSelect>>', self.on_armor_select)
        
        # Кнопки
        btn_frame = ttk.Frame(left_frame)
        btn_frame.pack(fill=tk.X, pady=5)
        
        ttk.Button(btn_frame, text="Добавить броню", command=self.add_armor).pack(side=tk.LEFT, fill=tk.X, expand=True)
        ttk.Button(btn_frame, text="Удалить броню", command=self.remove_armor).pack(side=tk.LEFT, fill=tk.X, expand=True)
        
        # Операции с файлами
        file_frame = ttk.Frame(left_frame)
        file_frame.pack(fill=tk.X, pady=5)
        
        ttk.Button(file_frame, text="Загрузить JSON", command=self.load_json).pack(side=tk.LEFT, fill=tk.X, expand=True)
        ttk.Button(file_frame, text="Сохранить JSON", command=self.save_json).pack(side=tk.LEFT, fill=tk.X, expand=True)
        ttk.Button(file_frame, text="Сохранить как", command=self.save_as_json).pack(side=tk.LEFT, fill=tk.X, expand=True)
        
        # Правый фрейм для редактирования
        right_frame = ttk.Frame(self.root, padding="10")
        right_frame.pack(side=tk.RIGHT, fill=tk.BOTH, expand=True)
        
        # Детали брони
        self.create_editor_form(right_frame)
        
    def create_editor_form(self, parent):
        # Превью изображения
        self.image_label = ttk.Label(parent, text="Изображение не выбрано", font=('Arial', 10))
        self.image_label.pack(pady=5)
        
        ttk.Button(parent, text="Выбрать изображение брони", command=self.select_image).pack(pady=5)
        
        # Поля формы
        form_frame = ttk.Frame(parent)
        form_frame.pack(fill=tk.BOTH, expand=True)
        
        # Название
        ttk.Label(form_frame, text="Название брони:", font=('Arial', 10, 'bold')).grid(row=0, column=0, sticky=tk.W, pady=3)
        self.name_entry = ttk.Entry(form_frame, width=80, font=('Arial', 10))
        self.name_entry.grid(row=0, column=1, sticky=tk.EW, pady=3, padx=5)
        
        # Категории
        ttk.Label(form_frame, text="Категории брони (через запятую):", font=('Arial', 10, 'bold')).grid(row=1, column=0, sticky=tk.W, pady=3)
        self.categories_entry = ttk.Entry(form_frame, width=80, font=('Arial', 10))
        self.categories_entry.grid(row=1, column=1, sticky=tk.EW, pady=3, padx=5)
        
        # Описание (увеличенное на 30%)
        ttk.Label(form_frame, text="Подробное описание брони:", font=('Arial', 10, 'bold')).grid(row=2, column=0, sticky=tk.NW, pady=3)
        self.description_text = tk.Text(form_frame, width=80, height=20, wrap=tk.WORD, font=('Arial', 10))
        self.description_text.grid(row=2, column=1, sticky=tk.EW, pady=3, padx=5)
        
        # Характеристики (xaract) - увеличенное поле
        ttk.Label(form_frame, text="Основные характеристики брони:", font=('Arial', 10, 'bold')).grid(row=3, column=0, sticky=tk.NW, pady=3)
        self.xaract_text = tk.Text(form_frame, width=80, height=12, wrap=tk.WORD, font=('Arial', 10))
        self.xaract_text.grid(row=3, column=1, sticky=tk.EW, pady=3, padx=5)
        
        # Дополнительные характеристики (blueStat) - увеличенное поле
        ttk.Label(form_frame, text="Дополнительные свойства и особенности:", font=('Arial', 10, 'bold')).grid(row=4, column=0, sticky=tk.NW, pady=3)
        self.blue_stat_text = tk.Text(form_frame, width=80, height=10, wrap=tk.WORD, font=('Arial', 10))
        self.blue_stat_text.grid(row=4, column=1, sticky=tk.EW, pady=3, padx=5)
        
        # Кнопка сохранения
        ttk.Button(parent, text="Сохранить все изменения", command=self.save_changes, style='Accent.TButton').pack(pady=15)
        
        # Стиль для акцентной кнопки
        style = ttk.Style()
        style.configure('Accent.TButton', font=('Arial', 10, 'bold'), foreground='blue')
    
    def load_json(self):
        filepath = filedialog.askopenfilename(
            title="Выберите файл с данными брони",
            filetypes=[("JSON файлы", "*.json"), ("Все файлы", "*.*")],
            initialdir=os.getcwd()
        )
        if filepath:
            try:
                with open(filepath, 'r', encoding='utf-8') as f:
                    self.data = json.load(f)
                self.filename = filepath
                self.update_armor_list()
                messagebox.showinfo("Успех", f"Файл брони успешно загружен!\n{filepath}")
            except Exception as e:
                messagebox.showerror("Ошибка", 
                    f"Не удалось загрузить файл брони:\n{str(e)}\n"
                    "Проверьте формат файла и попробуйте снова.")
    
    def save_json(self):
        if not self.filename:
            self.save_as_json()
            return
        
        try:
            with open(self.filename, 'w', encoding='utf-8') as f:
                json.dump(self.data, f, indent=4, ensure_ascii=False)
            messagebox.showinfo("Успех", f"Данные брони сохранены в файле:\n{self.filename}")
        except Exception as e:
            messagebox.showerror("Ошибка", 
                f"Не удалось сохранить файл брони:\n{str(e)}\n"
                "Проверьте доступ к файлу и попробуйте снова.")
    
    def save_as_json(self):
        filepath = filedialog.asksaveasfilename(
            title="Сохранить данные брони как",
            defaultextension=".json",
            filetypes=[("JSON файлы", "*.json"), ("Все файлы", "*.*")],
            initialdir=os.getcwd()
        )
        if filepath:
            self.filename = filepath
            self.save_json()
    
    def update_armor_list(self):
        self.armor_list.delete(0, tk.END)
        for armor in self.data["armor"]:
            name = armor.get("name", "Безымянная броня")
            self.armor_list.insert(tk.END, name)
    
    def on_armor_select(self, event):
        selection = self.armor_list.curselection()
        if selection:
            self.current_index = selection[0]
            self.display_armor(self.current_index)
    
    def display_armor(self, index):
        if 0 <= index < len(self.data["armor"]):
            armor = self.data["armor"][index]
            
            # Обновляем поля формы
            self.name_entry.delete(0, tk.END)
            self.name_entry.insert(0, armor.get("name", "Новая броня"))
            
            self.categories_entry.delete(0, tk.END)
            self.categories_entry.insert(0, ", ".join(armor.get("categories", ["Без категории"])))
            
            self.description_text.delete(1.0, tk.END)
            self.description_text.insert(tk.END, armor.get("description", "Подробное описание брони..."))
            
            self.xaract_text.delete(1.0, tk.END)
            self.xaract_text.insert(tk.END, armor.get("xaract", "Основные характеристики брони..."))
            
            self.blue_stat_text.delete(1.0, tk.END)
            self.blue_stat_text.insert(tk.END, armor.get("blueStat", "Дополнительные свойства брони..."))
            
            # Обновляем изображение
            self.display_image(armor.get("image", ""))
    
    def display_image(self, image_path):
        if not image_path or image_path == "../image/Armor/...":
            self.image_label.config(text="Изображение брони не выбрано", foreground='gray')
            return
        
        # Показываем путь к изображению с возможностью обрезки длинных путей
        display_path = image_path if len(image_path) < 50 else f"...{image_path[-47:]}"
        self.image_label.config(text=f"Изображение: {display_path}", foreground='black')
    
    def select_image(self):
        filepath = filedialog.askopenfilename(
            title="Выберите изображение брони",
            filetypes=[("Изображения", "*.png *.jpg *.jpeg"), ("Все файлы", "*.*")],
            initialdir=os.path.dirname(self.filename) if self.filename else os.getcwd()
        )
        if filepath:
            # Сохраняем относительный путь
            if self.filename:
                try:
                    base_dir = os.path.dirname(self.filename)
                    rel_path = os.path.relpath(filepath, base_dir)
                    rel_path = rel_path.replace('\\', '/')
                    if not rel_path.startswith('../'):
                        rel_path = f"../{rel_path}"
                except:
                    rel_path = filepath
            else:
                rel_path = filepath
            
            self.display_image(filepath)
            if 0 <= self.current_index < len(self.data["armor"]):
                self.data["armor"][self.current_index]["image"] = rel_path
    
    def add_armor(self):
        new_armor = {
            "name": "Новая броня",
            "image": "../image/Armor/...",
            "categories": ["Базовая"],
            "description": "Подробное описание характеристик и свойств этой брони...\n\n" * 2,
            "xaract": "Пулестойкость: 100%\nЗащита от ударов: 100%\nВес: 10 кг\n\n" * 3,
            "blueStat": "Особые свойства:\n- Защита от радиации\n- Устойчивость к огню\n\n" * 3
        }
        self.data["armor"].append(new_armor)
        self.update_armor_list()
        self.armor_list.selection_clear(0, tk.END)
        self.armor_list.selection_set(tk.END)
        self.armor_list.activate(tk.END)
        self.current_index = len(self.data["armor"]) - 1
        self.display_armor(self.current_index)
    
    def remove_armor(self):
        if 0 <= self.current_index < len(self.data["armor"]):
            armor_name = self.data["armor"][self.current_index].get("name", "эта броня")
            if messagebox.askyesno(
                "Подтверждение удаления",
                f"Вы уверены, что хотите удалить '{armor_name}'?\nЭто действие нельзя отменить!"):
                
                self.data["armor"].pop(self.current_index)
                self.update_armor_list()
                self.current_index = -1
                self.clear_form()
    
    def clear_form(self):
        self.name_entry.delete(0, tk.END)
        self.categories_entry.delete(0, tk.END)
        self.description_text.delete(1.0, tk.END)
        self.xaract_text.delete(1.0, tk.END)
        self.blue_stat_text.delete(1.0, tk.END)
        self.image_label.config(text="Изображение брони не выбрано", foreground='gray')
    
    def save_changes(self):
        if 0 <= self.current_index < len(self.data["armor"]):
            armor = self.data["armor"][self.current_index]
            
            armor["name"] = self.name_entry.get() or "Безымянная броня"
            
            categories = self.categories_entry.get().split(',')
            armor["categories"] = [cat.strip() for cat in categories if cat.strip()] or ["Без категории"]
            
            armor["description"] = self.description_text.get(1.0, tk.END).strip() or "Нет описания"
            armor["xaract"] = self.xaract_text.get(1.0, tk.END).strip() or "Нет характеристик"
            armor["blueStat"] = self.blue_stat_text.get(1.0, tk.END).strip() or "Нет дополнительных свойств"
            
            self.update_armor_list()
            messagebox.showinfo("Сохранено", "Все изменения в описании брони успешно сохранены!")
        else:
            messagebox.showwarning("Не выбрана броня", "Пожалуйста, выберите броню для редактирования или создайте новую.")

if __name__ == "__main__":
    root = tk.Tk()
    app = ArmorEditor(root)
    root.mainloop()