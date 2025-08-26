import json
import tkinter as tk
from tkinter import ttk, filedialog, messagebox
import os

class WeaponEditor:
    def __init__(self, root):
        self.root = root
        self.root.title("Редактор оружия JSON")
        self.root.geometry("900x700")
        
        # Инициализация данных
        self.data = {"weapon": []}
        self.current_index = -1
        self.filename = ""
        
        # Создание элементов интерфейса
        self.create_widgets()
        
    def create_widgets(self):
        # Фрейм для списка и кнопок
        left_frame = ttk.Frame(self.root, padding="10")
        left_frame.pack(side=tk.LEFT, fill=tk.Y)
        
        # Список оружия
        self.weapon_list = tk.Listbox(left_frame, width=30, height=20)
        self.weapon_list.pack(fill=tk.BOTH, expand=True)
        self.weapon_list.bind('<<ListboxSelect>>', self.on_weapon_select)
        
        # Кнопки
        btn_frame = ttk.Frame(left_frame)
        btn_frame.pack(fill=tk.X, pady=5)
        
        ttk.Button(btn_frame, text="Добавить", command=self.add_weapon).pack(side=tk.LEFT, fill=tk.X, expand=True)
        ttk.Button(btn_frame, text="Удалить", command=self.remove_weapon).pack(side=tk.LEFT, fill=tk.X, expand=True)
        
        # Операции с файлами
        file_frame = ttk.Frame(left_frame)
        file_frame.pack(fill=tk.X, pady=5)
        
        ttk.Button(file_frame, text="Загрузить JSON", command=self.load_json).pack(side=tk.LEFT, fill=tk.X, expand=True)
        ttk.Button(file_frame, text="Сохранить JSON", command=self.save_json).pack(side=tk.LEFT, fill=tk.X, expand=True)
        ttk.Button(file_frame, text="Сохранить как", command=self.save_as_json).pack(side=tk.LEFT, fill=tk.X, expand=True)
        
        # Правый фрейм для редактирования
        right_frame = ttk.Frame(self.root, padding="10")
        right_frame.pack(side=tk.RIGHT, fill=tk.BOTH, expand=True)
        
        # Детали оружия
        self.create_editor_form(right_frame)
        
    def create_editor_form(self, parent):
        # Превью изображения
        self.image_label = ttk.Label(parent, text="Изображение не выбрано")
        self.image_label.pack()
        
        ttk.Button(parent, text="Выбрать изображение", command=self.select_image).pack(pady=5)
        
        # Поля формы
        form_frame = ttk.Frame(parent)
        form_frame.pack(fill=tk.BOTH, expand=True)
        
        # Название
        ttk.Label(form_frame, text="Название:").grid(row=0, column=0, sticky=tk.W)
        self.name_entry = ttk.Entry(form_frame, width=40)
        self.name_entry.grid(row=0, column=1, sticky=tk.EW, pady=2)
        
        # Категории
        ttk.Label(form_frame, text="Категории (через запятую):").grid(row=1, column=0, sticky=tk.W)
        self.categories_entry = ttk.Entry(form_frame, width=40)
        self.categories_entry.grid(row=1, column=1, sticky=tk.EW, pady=2)
        
        # Описание
        ttk.Label(form_frame, text="Описание:").grid(row=2, column=0, sticky=tk.W)
        self.description_entry = ttk.Entry(form_frame, width=40)
        self.description_entry.grid(row=2, column=1, sticky=tk.EW, pady=2)
        
        # Характеристики (xaract)
        ttk.Label(form_frame, text="Характеристики:").grid(row=3, column=0, sticky=tk.W)
        self.xaract_text = tk.Text(form_frame, width=40, height=5)
        self.xaract_text.grid(row=3, column=1, sticky=tk.EW, pady=2)
        
        # Синие статы
        ttk.Label(form_frame, text="Синие статы:").grid(row=4, column=0, sticky=tk.W)
        self.blue_stat_text = tk.Text(form_frame, width=40, height=5)
        self.blue_stat_text.grid(row=4, column=1, sticky=tk.EW, pady=2)
        
        # Кнопка сохранения
        ttk.Button(parent, text="Сохранить изменения", command=self.save_changes).pack(pady=10)
        
    def load_json(self):
        filepath = filedialog.askopenfilename(filetypes=[("JSON файлы", "*.json")])
        if filepath:
            try:
                with open(filepath, 'r', encoding='utf-8') as f:
                    self.data = json.load(f)
                self.filename = filepath
                self.update_weapon_list()
                messagebox.showinfo("Успех", "JSON файл успешно загружен!")
            except Exception as e:
                messagebox.showerror("Ошибка", f"Ошибка загрузки JSON файла:\n{str(e)}")
    
    def save_json(self):
        if not self.filename:
            self.save_as_json()
            return
        
        try:
            with open(self.filename, 'w', encoding='utf-8') as f:
                json.dump(self.data, f, indent=2, ensure_ascii=False)
            messagebox.showinfo("Успех", "JSON файл успешно сохранен!")
        except Exception as e:
            messagebox.showerror("Ошибка", f"Ошибка сохранения JSON файла:\n{str(e)}")
    
    def save_as_json(self):
        filepath = filedialog.asksaveasfilename(defaultextension=".json", filetypes=[("JSON файлы", "*.json")])
        if filepath:
            self.filename = filepath
            self.save_json()
    
    def update_weapon_list(self):
        self.weapon_list.delete(0, tk.END)
        for weapon in self.data["weapon"]:
            name = weapon.get("name", "Безымянное оружие")
            self.weapon_list.insert(tk.END, name)
    
    def on_weapon_select(self, event):
        selection = self.weapon_list.curselection()
        if selection:
            self.current_index = selection[0]
            self.display_weapon(self.current_index)
    
    def display_weapon(self, index):
        if 0 <= index < len(self.data["weapon"]):
            weapon = self.data["weapon"][index]
            
            # Обновляем поля формы
            self.name_entry.delete(0, tk.END)
            self.name_entry.insert(0, weapon.get("name", ""))
            
            self.categories_entry.delete(0, tk.END)
            self.categories_entry.insert(0, ", ".join(weapon.get("categories", [])))
            
            self.description_entry.delete(0, tk.END)
            self.description_entry.insert(0, weapon.get("description", ""))
            
            self.xaract_text.delete(1.0, tk.END)
            self.xaract_text.insert(tk.END, weapon.get("xaract", ""))
            
            self.blue_stat_text.delete(1.0, tk.END)
            self.blue_stat_text.insert(tk.END, weapon.get("blueStat", ""))
            
            # Обновляем изображение
            self.display_image(weapon.get("image", ""))
    
    def display_image(self, image_path):
        if not image_path or image_path == "../image/Weapon/...":
            self.image_label.config(text="Изображение не выбрано")
            return
        
        # Просто показываем путь к изображению
        self.image_label.config(text=f"Изображение: {image_path}")
    
    def select_image(self):
        filepath = filedialog.askopenfilename(filetypes=[("Изображения", "*.png *.jpg *.jpeg")])
        if filepath:
            # Сохраняем относительный путь если возможно
            if self.filename:
                try:
                    base_dir = os.path.dirname(self.filename)
                    rel_path = os.path.relpath(filepath, base_dir)
                    # Исправляем разделители путей для единообразия
                    rel_path = rel_path.replace('\\', '/')
                    if not rel_path.startswith('../'):
                        rel_path = '../' + rel_path
                except:
                    rel_path = filepath
            else:
                rel_path = filepath
            
            self.display_image(filepath)
            # Обновляем путь к изображению для текущего оружия
            if 0 <= self.current_index < len(self.data["weapon"]):
                self.data["weapon"][self.current_index]["image"] = rel_path
    
    def add_weapon(self):
        new_weapon = {
            "name": "",
            "image": "../image/Weapon/...",
            "categories": [],
            "description": "-",
            "xaract": "-",
            "blueStat": "-"
        }
        self.data["weapon"].append(new_weapon)
        self.update_weapon_list()
        self.weapon_list.selection_clear(0, tk.END)
        self.weapon_list.selection_set(tk.END)
        self.weapon_list.activate(tk.END)
        self.current_index = len(self.data["weapon"]) - 1
        self.display_weapon(self.current_index)
    
    def remove_weapon(self):
        if 0 <= self.current_index < len(self.data["weapon"]):
            self.data["weapon"].pop(self.current_index)
            self.update_weapon_list()
            self.current_index = -1
            self.clear_form()
    
    def clear_form(self):
        self.name_entry.delete(0, tk.END)
        self.categories_entry.delete(0, tk.END)
        self.description_entry.delete(0, tk.END)
        self.xaract_text.delete(1.0, tk.END)
        self.blue_stat_text.delete(1.0, tk.END)
        self.image_label.config(text="Изображение не выбрано")
    
    def save_changes(self):
        if 0 <= self.current_index < len(self.data["weapon"]):
            weapon = self.data["weapon"][self.current_index]
            
            weapon["name"] = self.name_entry.get()
            
            categories = self.categories_entry.get().split(',')
            weapon["categories"] = [cat.strip() for cat in categories if cat.strip()]
            
            weapon["description"] = self.description_entry.get()
            weapon["xaract"] = self.xaract_text.get(1.0, tk.END).strip()
            weapon["blueStat"] = self.blue_stat_text.get(1.0, tk.END).strip()
            
            # Обновляем список для отражения изменений имени
            self.update_weapon_list()
            messagebox.showinfo("Успех", "Данные оружия сохранены!")
        else:
            messagebox.showwarning("Внимание", "Не выбрано оружие для сохранения!")

if __name__ == "__main__":
    root = tk.Tk()
    app = WeaponEditor(root)
    root.mainloop()