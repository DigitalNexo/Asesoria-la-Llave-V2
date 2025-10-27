#!/usr/bin/env python3
"""
Script para agregar directivas @map y @@map al schema de Prisma.
Convierte snake_case de DB a camelCase para la API de Prisma.
"""

import re
import sys

def snake_to_camel(snake_str):
    """Convierte snake_case a camelCase"""
    components = snake_str.split('_')
    return components[0] + ''.join(x.title() for x in components[1:])

def snake_to_pascal(snake_str):
    """Convierte snake_case a PascalCase"""
    components = snake_str.split('_')
    return ''.join(x.title() for x in components)

def process_schema(content):
    """Procesa el contenido del schema y agrega directivas @map"""
    lines = content.split('\n')
    result = []
    current_model = None
    in_model = False
    model_fields = []
    
    for i, line in enumerate(lines):
        # Detectar inicio de modelo
        model_match = re.match(r'^model\s+(\w+)\s+{', line)
        if model_match:
            in_model = True
            current_model = model_match.group(1)
            model_fields = []
            
            # Convertir nombre del modelo a PascalCase si es snake_case
            if '_' in current_model:
                pascal_name = snake_to_pascal(current_model)
                result.append(f'model {pascal_name} {{')
                continue
            else:
                result.append(line)
                continue
        
        # Detectar fin de modelo
        if in_model and line.strip().startswith('@@'):
            # Agregar el @@map al final si el modelo tiene snake_case
            if '_' in current_model:
                result.append(f'  @@map("{current_model}")')
            result.append(line)
            in_model = False
            current_model = None
            continue
        
        if in_model and line.strip() == '}':
            # Caso donde no hay directivas @@ antes del cierre
            if '_' in current_model:
                result.append(f'  @@map("{current_model}")')
            result.append(line)
            in_model = False
            current_model = None
            continue
        
        # Procesar campos dentro del modelo
        if in_model:
            # Buscar definición de campo: nombre tipo resto
            field_match = re.match(r'^(\s+)(\w+)(\s+)(\w+)(.*)$', line)
            if field_match:
                indent = field_match.group(1)
                field_name = field_match.group(2)
                space1 = field_match.group(3)
                field_type = field_match.group(4)
                rest = field_match.group(5)
                
                # Si el campo tiene snake_case y no es una relación
                if '_' in field_name and not field_type[0].isupper():
                    camel_name = snake_to_camel(field_name)
                    
                    # Verificar si ya tiene @map
                    if '@map(' not in rest:
                        # Encontrar dónde insertar @map (antes de @db si existe, al final si no)
                        if '@db' in rest or '@default' in rest or '@id' in rest or '@unique' in rest:
                            # Insertar antes del primer @
                            at_pos = rest.find('@')
                            if at_pos > 0:
                                rest = rest[:at_pos] + f'@map("{field_name}") ' + rest[at_pos:]
                            else:
                                rest = f' @map("{field_name}")' + rest
                        else:
                            rest += f' @map("{field_name}")'
                    
                    line = f'{indent}{camel_name}{space1}{field_type}{rest}'
                
                # Si el tipo de campo es una relación (empieza con mayúscula y tiene snake_case)
                elif field_type[0].isupper() and '_' in field_type:
                    pascal_type = snake_to_pascal(field_type)
                    line = f'{indent}{field_name}{space1}{pascal_type}{rest}'
        
        result.append(line)
    
    return '\n'.join(result)

def main():
    schema_file = 'prisma/schema.prisma'
    
    try:
        with open(schema_file, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Crear backup
        with open(f'{schema_file}.backup-map', 'w', encoding='utf-8') as f:
            f.write(content)
        
        # Procesar schema
        new_content = process_schema(content)
        
        # Guardar resultado
        with open(schema_file, 'w', encoding='utf-8') as f:
            f.write(new_content)
        
        print(f'✅ Schema actualizado con directivas @map')
        print(f'📋 Backup guardado en {schema_file}.backup-map')
        print(f'\n🔄 Ahora ejecuta: npx prisma generate')
        
    except Exception as e:
        print(f'❌ Error: {e}', file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
