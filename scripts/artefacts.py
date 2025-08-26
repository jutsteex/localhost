import json
import tkinter as tk
from tkinter import ttk, messagebox, filedialog
from typing import List, Dict, Any

class ArtifactEditor:
    def __init__(self, root):
        self.root = root
        self.root.title("Редактор артефактов JSON")
        self.root.geometry("900x700")
        
        # Хранение данных
        self.artifacts = []
        self.current_artifact_index = -1
        self.filename = ""
        
        # Создание интерфейса
        self.create_widgets()
        self.load_default_data()
        
    def create_widgets(self):
        # Основные фреймы
        self.left_frame = ttk.Frame(self.root, padding="10")
        self.left_frame.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        
        self.right_frame = ttk.Frame(self.root, padding="10")
        self.right_frame.pack(side=tk.RIGHT, fill=tk.BOTH, expand=True)
        
        # Список артефактов
        self.artifact_listbox = tk.Listbox(self.left_frame, height=25)
        self.artifact_listbox.pack(fill=tk.BOTH, expand=True, pady=(0, 10))
        self.artifact_listbox.bind('<<ListboxSelect>>', self.on_artifact_select)
        
        # Кнопки для списка
        button_frame = ttk.Frame(self.left_frame)
        button_frame.pack(fill=tk.X)
        
        self.add_btn = ttk.Button(button_frame, text="Добавить", command=self.add_new_artifact)
        self.add_btn.pack(side=tk.LEFT, padx=5)
        
        self.delete_btn = ttk.Button(button_frame, text="Удалить", command=self.delete_artifact)
        self.delete_btn.pack(side=tk.LEFT, padx=5)
        
        # Операции с файлами
        file_frame = ttk.Frame(self.left_frame)
        file_frame.pack(fill=tk.X, pady=(10, 0))
        
        self.load_btn = ttk.Button(file_frame, text="Загрузить JSON", command=self.load_json)
        self.load_btn.pack(side=tk.LEFT, padx=5)
        
        self.save_btn = ttk.Button(file_frame, text="Сохранить", command=self.save_json)
        self.save_btn.pack(side=tk.LEFT, padx=5)
        
        self.save_as_btn = ttk.Button(file_frame, text="Сохранить как", command=self.save_as_json)
        self.save_as_btn.pack(side=tk.LEFT, padx=5)
        
        # Детали артефакта
        self.notebook = ttk.Notebook(self.right_frame)
        self.notebook.pack(fill=tk.BOTH, expand=True)
        
        # Вкладка основной информации
        self.basic_frame = ttk.Frame(self.notebook)
        self.notebook.add(self.basic_frame, text="Основная информация")
        
        ttk.Label(self.basic_frame, text="Название:").grid(row=0, column=0, sticky=tk.W, pady=2)
        self.name_entry = ttk.Entry(self.basic_frame)
        self.name_entry.grid(row=0, column=1, sticky=tk.EW, padx=5, pady=2)
        
        ttk.Label(self.basic_frame, text="Путь к изображению:").grid(row=1, column=0, sticky=tk.W, pady=2)
        self.image_entry = ttk.Entry(self.basic_frame)
        self.image_entry.grid(row=1, column=1, sticky=tk.EW, padx=5, pady=2)
        
        ttk.Label(self.basic_frame, text="Категории:").grid(row=2, column=0, sticky=tk.W, pady=2)
        self.categories_entry = ttk.Entry(self.basic_frame)
        self.categories_entry.grid(row=2, column=1, sticky=tk.EW, padx=5, pady=2)
        self.categories_entry.insert(0, "Через запятую (bio,electro,grav и т.д.)")
        
        ttk.Label(self.basic_frame, text="Описание:").grid(row=3, column=0, sticky=tk.W, pady=2)
        self.desc_text = tk.Text(self.basic_frame, height=5, width=40)
        self.desc_text.grid(row=4, column=0, columnspan=2, sticky=tk.EW, padx=5, pady=2)
        
        # Вкладка характеристик
        self.stats_frame = ttk.Frame(self.notebook)
        self.notebook.add(self.stats_frame, text="Характеристики")
        
        ttk.Label(self.stats_frame, text="Характеристики (xaract):").grid(row=0, column=0, sticky=tk.W, pady=2)
        self.xaract_text = tk.Text(self.stats_frame, height=8, width=40)
        self.xaract_text.grid(row=1, column=0, columnspan=2, sticky=tk.EW, padx=5, pady=2)
        self.xaract_text.insert(tk.END, "По одной характеристике на строку (например, 'Радиация: -2,50 <-> -12,50')")
        
        ttk.Label(self.stats_frame, text="Синяя характеристика:").grid(row=2, column=0, sticky=tk.W, pady=2)
        self.blue_stat_entry = ttk.Entry(self.stats_frame)
        self.blue_stat_entry.grid(row=2, column=1, sticky=tk.EW, padx=5, pady=2)
        
        # Кнопка обновления
        self.update_btn = ttk.Button(self.right_frame, text="Обновить артефакт", command=self.update_artifact)
        self.update_btn.pack(pady=10)
        
        # Настройка весов сетки
        self.basic_frame.columnconfigure(1, weight=1)
        self.stats_frame.columnconfigure(1, weight=1)
        
    def load_default_data(self):
        # Загрузка начальных данных из предоставленного JSON
        default_data = {
            "artifacts": [
                {
                    "name": "Аленький цветочек",
                    "image": "../image/Art/art_uni_aliycvet.png",
                    "categories": ["bio"],
                    "description": "Легендарный артефакт, Внешне уникально красив - выглядит как цветок мечты любого человека, не вянет, не обладает неприятным запахом, довольно прочен.",
                    "xaract": "Радиация: -2,50 <-> -12,50",
                    "blueStat": "Восстановление выносливости: 1,00"
                }
            ]
        }
        self.artifacts = default_data["artifacts"]
        self.update_artifact_list()
        
    def load_json(self):
        filepath = filedialog.askopenfilename(filetypes=[("JSON файлы", "*.json")])
        if filepath:
            try:
                with open(filepath, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    self.artifacts = data.get("artifacts", [])
                    self.filename = filepath
                    self.update_artifact_list()
                    messagebox.showinfo("Успех", f"Загружено {len(self.artifacts)} артефактов из {filepath}")
            except Exception as e:
                messagebox.showerror("Ошибка", f"Не удалось загрузить файл: {str(e)}")
    
    def save_json(self):
        if not self.filename:
            self.save_as_json()
            return
            
        try:
            with open(self.filename, 'w', encoding='utf-8') as f:
                json.dump({"artifacts": self.artifacts}, f, ensure_ascii=False, indent=2)
            messagebox.showinfo("Успех", f"Сохранено {len(self.artifacts)} артефактов в {self.filename}")
        except Exception as e:
            messagebox.showerror("Ошибка", f"Не удалось сохранить файл: {str(e)}")
    
    def save_as_json(self):
        filepath = filedialog.asksaveasfilename(defaultextension=".json", filetypes=[("JSON файлы", "*.json")])
        if filepath:
            self.filename = filepath
            self.save_json()
    
    def update_artifact_list(self):
        self.artifact_listbox.delete(0, tk.END)
        for artifact in self.artifacts:
            self.artifact_listbox.insert(tk.END, artifact["name"])
    
    def on_artifact_select(self, event):
        selection = self.artifact_listbox.curselection()
        if selection:
            self.current_artifact_index = selection[0]
            self.display_artifact(self.artifacts[self.current_artifact_index])
    
    def display_artifact(self, artifact: Dict[str, Any]):
        # Основная информация
        self.name_entry.delete(0, tk.END)
        self.name_entry.insert(0, artifact.get("name", ""))
        
        self.image_entry.delete(0, tk.END)
        self.image_entry.insert(0, artifact.get("image", ""))
        
        categories = artifact.get("categories", [])
        self.categories_entry.delete(0, tk.END)
        self.categories_entry.insert(0, ", ".join(categories))
        
        self.desc_text.delete(1.0, tk.END)
        self.desc_text.insert(tk.END, artifact.get("description", ""))
        
        # Характеристики
        self.xaract_text.delete(1.0, tk.END)
        self.xaract_text.insert(tk.END, artifact.get("xaract", ""))
        
        self.blue_stat_entry.delete(0, tk.END)
        self.blue_stat_entry.insert(0, artifact.get("blueStat", "-"))
    
    def add_new_artifact(self):
        new_artifact = {
            "name": "Новый артефакт",
            "image": "",
            "categories": [],
            "description": "",
            "xaract": "",
            "blueStat": "-"
        }
        self.artifacts.append(new_artifact)
        self.update_artifact_list()
        self.artifact_listbox.selection_clear(0, tk.END)
        self.artifact_listbox.selection_set(tk.END)
        self.artifact_listbox.activate(tk.END)
        self.current_artifact_index = len(self.artifacts) - 1
        self.display_artifact(new_artifact)
    
    def delete_artifact(self):
        if self.current_artifact_index >= 0:
            del self.artifacts[self.current_artifact_index]
            self.update_artifact_list()
            self.current_artifact_index = -1
            self.clear_fields()
    
    def clear_fields(self):
        self.name_entry.delete(0, tk.END)
        self.image_entry.delete(0, tk.END)
        self.categories_entry.delete(0, tk.END)
        self.desc_text.delete(1.0, tk.END)
        self.xaract_text.delete(1.0, tk.END)
        self.blue_stat_entry.delete(0, tk.END)
    
    def update_artifact(self):
        if self.current_artifact_index >= 0:
            artifact = self.artifacts[self.current_artifact_index]
            
            # Обновление основной информации
            artifact["name"] = self.name_entry.get()
            artifact["image"] = self.image_entry.get()
            
            categories = self.categories_entry.get()
            if categories == "Через запятую (bio,electro,grav и т.д.)":
                artifact["categories"] = []
            else:
                artifact["categories"] = [cat.strip() for cat in categories.split(",")]
            
            artifact["description"] = self.desc_text.get("1.0", tk.END).strip()
            
            # Обновление характеристик
            xaract = self.xaract_text.get("1.0", tk.END).strip()
            if xaract == "По одной характеристике на строку (например, 'Радиация: -2,50 <-> -12,50')":
                artifact["xaract"] = ""
            else:
                artifact["xaract"] = xaract
            
            artifact["blueStat"] = self.blue_stat_entry.get()
            
            # Обновление отображения списка
            self.update_artifact_list()
            messagebox.showinfo("Успех", "Артефакт успешно обновлен")

def main():
    root = tk.Tk()
    app = ArtifactEditor(root)
    root.mainloop()

if __name__ == "__main__":
    main()