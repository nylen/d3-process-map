#!/bin/sh

cd "$(dirname "$0")"

cat characters.txt | while read i; do
    name="`echo "$i"|cut -d: -f1`";
    text="`echo "$i"|cut -d: -f2-`";
    echo "Writing $name.mkdn"
    echo "$text" | fold -sw 80 > "../$name.mkdn"
done

cut -d: -f1 characters.txt | while read name; do
    echo "Replacing instances of $name with links"
    sed -i "s#$name#{{$name}}#g" ../*.mkdn
done

# Replaceing Thenardier before Mme.Thenardier would cause problems, but the e
# is accented so no replacements are made anyway.
