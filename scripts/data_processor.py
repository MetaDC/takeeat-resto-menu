import pandas as pd
import os
import json
import re
import zipfile
import shutil

def get_image_mapping(zip_file):
    mapping = {}
    rel_map = {}
    
    rels_path = 'xl/drawings/_rels/drawing1.xml.rels'
    drawing_path = 'xl/drawings/drawing1.xml'
    
    try:
        with zipfile.ZipFile(zip_file, 'r') as z:
            if rels_path in z.namelist():
                xml_content = z.read(rels_path).decode('utf-8', errors='ignore')
                pattern = r'Id="(rId\d+)"[^>]+Target="([^"]+)"'
                for rId, target in re.findall(pattern, xml_content):
                    target = target.replace('../media/', 'xl/media/')
                    rel_map[rId] = target
            
            if drawing_path in z.namelist():
                xml_content = z.read(drawing_path).decode('utf-8', errors='ignore')
                anchor_blocks = re.findall(r'<xdr:twoCellAnchor[^>]*>(.*?)</xdr:twoCellAnchor>', xml_content, re.DOTALL)
                for block in anchor_blocks:
                    row_match = re.search(r'<xdr:from>.*?<xdr:row>(\d+)</xdr:row>', block, re.DOTALL)
                    embed_match = re.search(r'<a:blip[^>]+r:embed="(rId\d+)"', block, re.DOTALL)
                    if row_match and embed_match:
                        row = int(row_match.group(1))
                        rId = embed_match.group(1)
                        if rId in rel_map:
                            mapping[row] = rel_map[rId]
        return mapping
    except:
        return {}

def extract_menu_images(file_path, restaurant_id, mapping, base_dir):
    output_dir = os.path.join(base_dir, "webapp/public/images/menu", restaurant_id)
    os.makedirs(output_dir, exist_ok=True)
    
    extracted = {}
    try:
        with zipfile.ZipFile(file_path, 'r') as z:
            for row, image_path in mapping.items():
                if image_path in z.namelist():
                    ext = os.path.splitext(image_path)[1]
                    target_filename = f"row_{row + 1}{ext}"
                    target_path = os.path.join(output_dir, target_filename)
                    with z.open(image_path) as source, open(target_path, 'wb') as target:
                        shutil.copyfileobj(source, target)
                    extracted[row + 1] = f"/images/menu/{restaurant_id}/{target_filename}"
    except:
        pass
    return extracted

def parse_metadata(metadata_str):
    res = {
        "area": "N/A",
        "rating": "N/A",
        "categories": [],
        "price_for_two": "N/A",
        "link": "N/A"
    }
    
    if pd.isna(metadata_str):
        return res

    area_match = re.search(r'📍\s*([^⭐🍴💰⏱🔗]+)', metadata_str)
    if area_match: res["area"] = area_match.group(1).strip()
    
    rating_match = re.search(r'⭐\s*([\d\.]+(?:\s*\([\d]+\s*ratings\))?)', metadata_str)
    if rating_match: res["rating"] = rating_match.group(1).strip()
        
    cat_match = re.search(r'🍴\s*([^💰⏱🔗]+)', metadata_str)
    if cat_match: res["categories"] = [c.strip() for c in cat_match.group(1).split(',')]
        
    price_match = re.search(r'💰\s*([^⏱🔗]+)', metadata_str)
    if price_match: res["price_for_two"] = price_match.group(1).strip()
        
    link_match = re.search(r'🔗\s*(https?://[^\s]+)', metadata_str)
    if link_match: res["link"] = link_match.group(1).strip()
        
    return res

def process_excel(file_path, base_dir):
    try:
        df = pd.read_excel(file_path)
        raw_name = df.columns[0]
        name = re.sub(r'[^\w\s-]', '', raw_name).replace('Full Menu', '').strip()
        name = re.sub(r'\s*-\s*', ' ', name).strip()
        
        restaurant_id = re.sub(r'[^\w]', '_', name.lower())
        image_mapping = get_image_mapping(file_path)
        local_images = extract_menu_images(file_path, restaurant_id, image_mapping, base_dir)
        
        metadata_str = df.iloc[0, 0]
        metadata = parse_metadata(metadata_str)
        
        menu = []
        for i in range(1, len(df)):
            row = df.iloc[i]
            if len(row) < 5: continue
            
            item_name = row.iloc[3]
            price = row.iloc[4]
            category = row.iloc[2]
            image_id = row.iloc[7] if len(row) > 7 else None
            description = row.iloc[8] if len(row) > 8 else ""
            
            # Row index in Excel is i + 2 (because pandas header is row 0 and it skips one or two)
            # Actually, my extract script used row index from XML which is 0-based.
            # mapping[row_idx] -> image_path
            # Let's use the local_images dict which has row + 1 as key.
            # Row index in pandas i + 1 corresponds to Excel row i + 2.
            # Let's adjust mapping logic if needed. 
            # In Satyavijay, Row 4 was the first item. 
            local_img_path = local_images.get(i + 2)
            
            if pd.isna(item_name) or str(item_name).strip() == "" or str(item_name).strip() == "Item Name":
                continue
                
            menu.append({
                "name": str(item_name).strip(),
                "price": str(price).strip() if not pd.isna(price) else "N/A",
                "category": str(category).strip() if not pd.isna(category) else "Uncategorized",
                "imageId": str(image_id).strip() if not pd.isna(image_id) else None,
                "localImage": local_img_path,
                "description": str(description).strip() if not pd.isna(description) else ""
            })
            
        return {
            "name": name,
            "area": metadata["area"],
            "rating": metadata["rating"],
            "categories": metadata["categories"],
            "price_for_two": metadata["price_for_two"],
            "link": metadata["link"],
            "menu": menu
        }
    except Exception as e:
        print(f"Error processing {file_path}: {e}")
        return None

def main():
    base_dir = "/Users/diwizon/Documents/sameerbhai/takeeat-demo"
    directories = ["Restolist-1", "Restolist-2", "Restolist-3", "Restolist-4", "Restolist-5"]
    restaurants = []
    
    for d in directories:
        directory = os.path.join(base_dir, d)
        if not os.path.exists(directory): continue
            
        files = [f for f in os.listdir(directory) if f.endswith('.xlsx')]
        print(f"Processing {len(files)} files in {d}...")
        
        for filename in files:
            file_path = os.path.join(directory, filename)
            data = process_excel(file_path, base_dir)
            if data:
                restaurants.append(data)
            
    output_dir = os.path.join(base_dir, "webapp/public/data")
    os.makedirs(output_dir, exist_ok=True)
    
    with open(os.path.join(output_dir, "restaurants.json"), "w") as f:
        json.dump(restaurants, f, indent=2)
        
    print(f"Successfully processed {len(restaurants)} restaurants with images.")

if __name__ == "__main__":
    main()
