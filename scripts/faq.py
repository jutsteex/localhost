import json
import tkinter as tk
from tkinter import messagebox, filedialog, ttk

class FAQEditor:
    def __init__(self, root):
        self.root = root
        self.root.title("Редактор FAQ для STALCUBE")
        self.root.geometry("800x600")
        
        self.faq_data = []
        self.current_index = None
        self.filename = "faq.json"
        
        self.create_widgets()
        self.load_data()
    
    def create_widgets(self):
        # Фрейм для списка вопросов
        list_frame = tk.Frame(self.root)
        list_frame.pack(side=tk.LEFT, fill=tk.Y, padx=5, pady=5)
        
        self.listbox = tk.Listbox(list_frame, width=30, height=20)
        self.listbox.pack(fill=tk.BOTH, expand=True)
        self.listbox.bind('<<ListboxSelect>>', self.on_select)
        
        # Кнопки для списка
        btn_add = tk.Button(list_frame, text="Добавить вопрос", command=self.add_item)
        btn_add.pack(fill=tk.X, pady=2)
        
        btn_remove = tk.Button(list_frame, text="Удалить вопрос", command=self.remove_item)
        btn_remove.pack(fill=tk.X, pady=2)
        
        # Фрейм для редактирования
        edit_frame = tk.Frame(self.root)
        edit_frame.pack(side=tk.RIGHT, fill=tk.BOTH, expand=True, padx=5, pady=5)
        
        # Поля ввода
        tk.Label(edit_frame, text="Вопрос:").pack(anchor=tk.W)
        self.question_entry = tk.Text(edit_frame, height=3, wrap=tk.WORD)
        self.question_entry.pack(fill=tk.X, pady=5)
        
        tk.Label(edit_frame, text="Ответ:").pack(anchor=tk.W)
        self.answer_entry = tk.Text(edit_frame, height=10, wrap=tk.WORD)
        self.answer_entry.pack(fill=tk.BOTH, expand=True, pady=5)
        
        # Кнопки сохранения
        btn_save = tk.Button(edit_frame, text="Сохранить изменения", command=self.save_changes)
        btn_save.pack(side=tk.LEFT, padx=2)
        
        btn_save_as = tk.Button(edit_frame, text="Сохранить как...", command=self.save_as)
        btn_save_as.pack(side=tk.LEFT, padx=2)
        
        btn_load = tk.Button(edit_frame, text="Загрузить из файла", command=self.load_from_file)
        btn_load.pack(side=tk.RIGHT, padx=2)
    
    def load_data(self):
        try:
            with open(self.filename, 'r', encoding='utf-8') as f:
                self.faq_data = json.load(f)
            self.update_listbox()
        except FileNotFoundError:
            self.faq_data = []
        except json.JSONDecodeError:
            messagebox.showerror("Ошибка", "Файл поврежден или имеет неверный формат")
            self.faq_data = []
    
    def update_listbox(self):
        self.listbox.delete(0, tk.END)
        for item in self.faq_data:
            question = item['question'][:50] + "..." if len(item['question']) > 50 else item['question']
            self.listbox.insert(tk.END, question)
    
    def on_select(self, event):
        if not self.listbox.curselection():
            return
            
        self.current_index = self.listbox.curselection()[0]
        item = self.faq_data[self.current_index]
        
        self.question_entry.delete(1.0, tk.END)
        self.question_entry.insert(tk.END, item['question'])
        
        self.answer_entry.delete(1.0, tk.END)
        self.answer_entry.insert(tk.END, item['answer'])
    
    def add_item(self):
        self.faq_data.append({"question": "Новый вопрос", "answer": "Новый ответ"})
        self.update_listbox()
        self.listbox.selection_clear(0, tk.END)
        self.listbox.selection_set(tk.END)
        self.listbox.activate(tk.END)
        self.on_select(None)
    
    def remove_item(self):
        if not self.listbox.curselection():
            return
            
        index = self.listbox.curselection()[0]
        self.faq_data.pop(index)
        self.update_listbox()
        self.clear_fields()
    
    def clear_fields(self):
        self.question_entry.delete(1.0, tk.END)
        self.answer_entry.delete(1.0, tk.END)
        self.current_index = None
    
    def save_changes(self):
        if self.current_index is not None and 0 <= self.current_index < len(self.faq_data):
            question = self.question_entry.get(1.0, tk.END).strip()
            answer = self.answer_entry.get(1.0, tk.END).strip()
            
            if not question or not answer:
                messagebox.showwarning("Предупреждение", "Вопрос и ответ не могут быть пустыми")
                return
                
            self.faq_data[self.current_index] = {
                "question": question,
                "answer": answer
            }
            self.update_listbox()
    
    def save_as(self):
        filename = filedialog.asksaveasfilename(
            defaultextension=".json",
            filetypes=[("JSON files", "*.json"), ("All files", "*.*")],
            initialfile="faq.json"
        )
        
        if filename:
            self.filename = filename
            self.save_data()
    
    def save_data(self):
        try:
            with open(self.filename, 'w', encoding='utf-8') as f:
                json.dump(self.faq_data, f, ensure_ascii=False, indent=4)
            messagebox.showinfo("Успех", "Данные успешно сохранены")
        except Exception as e:
            messagebox.showerror("Ошибка", f"Не удалось сохранить файл: {str(e)}")
    
    def load_from_file(self):
        filename = filedialog.askopenfilename(
            filetypes=[("JSON files", "*.json"), ("All files", "*.*")]
        )
        
        if filename:
            self.filename = filename
            self.load_data()

if __name__ == "__main__":
    root = tk.Tk()
    app = FAQEditor(root)
    root.mainloop()